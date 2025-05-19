const config = require('../config');

// Check if two responses are a cross-duplicate match
const checkIfMatch = (s1, s2, nlev, rlev, nlcs, rlcs) => {
    const maxStringLength = Math.max(s1.length, s2.length);
    if (nlev < config.normLevThreshold) return true;
    if (rlev < config.rawLevThreshold && maxStringLength > 5) return true;
    if (rlev <= 1 && maxStringLength > 2) return true;
    if (nlcs >= config.normLCSThreshold) return true;
    if (rlcs >= config.rawLCSThreshold) return true;
    return false;
}

// Helper for runDuplicateCheck
const shouldRunMetric =({ longer, shorter, diff }) => {
  return (
    diff / longer <= config.normLevThreshold           // n-Lev
    && !(longer > 5 && diff >= config.rawLevThreshold) // raw Lev
    && shorter >= config.rawLCSThreshold               // raw LCS
    && shorter / longer >= config.normLCSThreshold     // n-LCS
  );
}

// T/F for whether the duplicate check can be skipped
const runDuplicateCheck = (a, b) => {
  const [longer, shorter] = [a.length, b.length].sort((x, y) => y - x);
  return shouldRunMetric({ longer, shorter, diff: longer - shorter });
};

// AWS SDK for DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Initialize Lambda client
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Get the other responses other participants have given to the survey
const getOtherResponsesFromSurvey = async (cleanedFinalStates, surveyId) => {
    console.log('Getting other responses from survey:', surveyId);
    
    try {
        // Query DynamoDB for responses from this survey
        const params = {
            TableName: process.env.RESPONSES_TABLE || 'SurveyResponses',
            KeyConditionExpression: 'surveyId = :surveyId',
            ExpressionAttributeValues: {
                ':surveyId': surveyId
            }
        };
        
        const { Items } = await ddbDocClient.send(new QueryCommand(params));
        
        // Format responses for duplicate checking
        const otherResponses = {};
        
        if (Items && Items.length > 0) {
            Items.forEach(item => {
                if (item.responses) {
                    Object.keys(item.responses).forEach(questionId => {
                        if (!otherResponses[questionId]) {
                            otherResponses[questionId] = [];
                        }
                        
                        // Only add if the response is from a different participant
                        if (item.participantId !== process.env.CURRENT_PARTICIPANT_ID) {
                            const cleanedFinalState = cleanedFinalStates[questionId] || '';
                            
                            otherResponses[questionId].push({
                                finalState: cleanedFinalState,
                                participantId: item.participantId,
                                responseGroup: item.responseGroups ? item.responseGroups[questionId] || 0 : 0
                            });
                        }
                    });
                }
            });
        }
        
        return otherResponses;
    } catch (error) {
        console.error('Error fetching other responses:', error);
        // Return empty object on error to allow processing to continue
        return {};
    }
}

// Call the function to identify duplicates
const batchedResponse = async (target, responses) => {
    console.log('Calling identify-duplicates Lambda function');
    
    try {
        // Call the identify-duplicates Lambda function directly
        const params = {
            FunctionName: process.env.IDENTIFY_DUPLICATES_FUNCTION || 'roundtable-alias-dev-identifyDuplicates',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({ 
                body: JSON.stringify({ s1: target, responses })
            })
        };
        
        const { Payload } = await lambdaClient.send(new InvokeCommand(params));
        const result = JSON.parse(Buffer.from(Payload).toString());
        
        // Parse the Lambda response
        const body = JSON.parse(result.body);
        
        if (body.error) {
            throw new Error('Problem identifying duplicate responses');
        }
        
        return body.responsesWithMetrics;
    } catch (error) {
        console.error('Error calling identify-duplicates:', error);
        throw error;
    }
};

// Helper function to divide an array into subarrays of size m
const divideArray = (arr, m) => {
    const n = arr.length;
    const subarraySize = Math.floor(n / m);
    const remainder = n % m;
    const result = [];
    let startIndex = 0;

    for (let i = 0; i < m; i++) {
        // Adjust size for the subarrays to handle the remainder
        const size = subarraySize + (i < remainder ? 1 : 0);
        const subarray = arr.slice(startIndex, startIndex + size);
        result.push(subarray);
        startIndex += size;
    }

    return result;
}

// Helper for cross duplicate check 
function processResponses(responses) {
    return responses.filter(response => {
        const { s1, s2, nlev, rlev, nlcs, rlcs } = response;
        return checkIfMatch(s1, s2, nlev, rlev, nlcs, rlcs);
    }).filter(response => Number.isInteger(response.responseGroup));
}

// Get the most common group value with the lowest rlev from the matching responses
function findBestMatch(matchingResponses) {
    const lowestRlev = Math.min(...matchingResponses.map(response => response.rlev));
    const matchesWithLowestRlev = matchingResponses.filter(response => response.rlev === lowestRlev);
    return parseInt(Object.entries(matchesWithLowestRlev.reduce((acc, { responseGroup }) => {
        acc[responseGroup] = (acc[responseGroup] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0][0], 10);
}

// Increment the group counter for the question if no duplicates are found
const getGroupValue = async (surveyId, questionId) => {
    console.log('Incrementing group counter for question:', questionId);
    
    try {
        // Update the group counter in DynamoDB
        const params = {
            TableName: process.env.GROUPS_TABLE || 'SurveyGroups',
            Key: {
                surveyId: surveyId,
                questionId: questionId
            },
            UpdateExpression: 'SET groupCounter = if_not_exists(groupCounter, :start) + :increment',
            ExpressionAttributeValues: {
                ':start': 0,
                ':increment': 1
            },
            ReturnValues: 'UPDATED_NEW'
        };
        
        const { Attributes } = await ddbDocClient.send(new UpdateCommand(params));
        
        // Return the new group counter value
        return Attributes.groupCounter;
    } catch (error) {
        console.error('Error incrementing group counter:', error);
        // Fallback to a random value if DynamoDB operation fails
        return Math.floor(Math.random() * 1000) + 1;
    }
};

// Check for cross-duplicate responses within the survey
const checkForCrossDuplicateResponses = async (cleanedFinalStates, survey_id) => {

    // Get other responses from the survey
    const otherResponses = await getOtherResponsesFromSurvey(cleanedFinalStates, survey_id);
    const cleanedFinalStateIds = Object.keys(cleanedFinalStates);
    const nonEmptyFinalStateIds = cleanedFinalStateIds.filter(id => cleanedFinalStates[id] !== '');
    const duplicateResponses = {};
    const responseGroups = {};

    try {

        // Batch and check for duplicates in each responses in parallel
        const allPromises = nonEmptyFinalStateIds.flatMap(id => {
            const rawResponses = otherResponses[id] || [];
            const responses = rawResponses.filter(response => runDuplicateCheck(cleanedFinalStates[id], response.finalState));
            return divideArray(responses, Math.ceil(responses.length / config.maxBatchSize))
                .map(group => batchedResponse(cleanedFinalStates[id], group)
                    .then(result => [id, result]));
        });

        // Resolve all promises in parallel
        const resolvedPromises = await Promise.all(allPromises);

        const resolvedIds = new Set(resolvedPromises.map(([id, _]) => id));

        // Loop through cleanedFinalStates ids and check for duplicates
        for (let i = 0; i < cleanedFinalStateIds.length; i++) {
            const id = cleanedFinalStateIds[i];
            // Check if this ID's promise was resolved
            if (!resolvedIds.has(id)) {
                duplicateResponses[id] = [];
                const groupValue = cleanedFinalStates[id] === '' ? 0 : await getGroupValue(survey_id, id);
                responseGroups[id] = groupValue;
                continue;
            }

            // Find the resolved promise for this ID
            const relevantResolvedPromise = resolvedPromises.find(([resolvedId, _]) => resolvedId === id)[1];
            const matchingResponses = processResponses(relevantResolvedPromise || []);
            if (!matchingResponses.length) {
                duplicateResponses[id] = [];
                const groupValue = cleanedFinalStates[id] === '' ? 0 : await getGroupValue(survey_id, id);
                responseGroups[id] = groupValue;
                continue;
            }

            const bestMatchGroup = findBestMatch(matchingResponses);
            responseGroups[id] = bestMatchGroup;

            const duplicates = matchingResponses.filter(response => response.responseGroup === bestMatchGroup);
            duplicateResponses[id] = duplicates.map(response => response.s2);
        }

    } catch (error) {
        console.log('Error processing responses:', error);
        // Throw error to be caught by caller
        throw error;
    }

    return { duplicateResponses, responseGroups };
}

module.exports = { checkForCrossDuplicateResponses, checkIfMatch};

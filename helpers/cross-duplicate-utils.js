const config = require('../config');

// Check if two responses are a cross-duplicate match
const checkIfMatch = (s1, s2, nlev, rlev, nlcs, rlcs) => {
    console.log('Checking if match:', { s1, s2, nlev, rlev, nlcs, rlcs });
    console.log('Thresholds:', {
        normLevThreshold: config.normLevThreshold,
        rawLevThreshold: config.rawLevThreshold,
        normLCSThreshold: config.normLCSThreshold,
        rawLCSThreshold: config.rawLCSThreshold
    });

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

// In-memory storage for local development - make it global so it's shared between requests
global.localResponsesStorage = global.localResponsesStorage || {};
const localResponsesStorage = global.localResponsesStorage;

// Get the other responses other participants have given to the survey
const getOtherResponsesFromSurvey = async (cleanedFinalStates, surveyId, currentParticipantId) => {
    console.log('Getting other responses from survey:', surveyId);
    console.log('Current participant ID:', currentParticipantId);
    console.log('Type of currentParticipantId:', typeof currentParticipantId);

    try {
        // Check if we're running in local development mode
        const isLocalDevelopment = process.env.IS_OFFLINE === 'true';

        let Items = [];

        if (isLocalDevelopment) {
            // Use in-memory storage for local development
            console.log('Using in-memory storage for local development');
            Items = localResponsesStorage[surveyId] || [];
            console.log('Local storage items:', Items.length);
        } else {
            // Query DynamoDB for responses from this survey
            const params = {
                TableName: process.env.RESPONSES_TABLE || 'SurveyResponses',
                KeyConditionExpression: 'surveyId = :surveyId',
                ExpressionAttributeValues: {
                    ':surveyId': surveyId
                }
            };

            console.log('DynamoDB query params:', JSON.stringify(params));

            const result = await ddbDocClient.send(new QueryCommand(params));
            Items = result.Items || [];
        }

        console.log('Query returned items:', Items ? Items.length : 0);
        if (Items && Items.length > 0) {
            console.log('First item sample:', JSON.stringify(Items[0]).substring(0, 200) + '...');
            // Log all participant IDs for debugging
            console.log('All participant IDs in results:', Items.map(item => item.participantId).join(', '));
        }

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
                        console.log(`Comparing participant IDs: item.participantId=${item.participantId}, currentParticipantId=${currentParticipantId}, equal=${item.participantId === currentParticipantId}`);
                        if (item.participantId !== currentParticipantId) {
                            console.log(`Found response from different participant: ${item.participantId}`);

                            // Use the other participant's response, not the current participant's
                            const otherParticipantResponse = item.responses[questionId] || '';

                            // Clean the other participant's response the same way we clean the current participant's
                            const cleanedOtherResponse = otherParticipantResponse.toString().toLowerCase()
                                .replace(/\n/g, ' ')
                                .replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');

                            // Log the cleaned response for debugging
                            console.log(`Cleaned response from ${item.participantId} for ${questionId}:`, cleanedOtherResponse);

                            otherResponses[questionId].push({
                                finalState: cleanedOtherResponse,
                                participantId: item.participantId,
                                responseGroup: item.responseGroups ? item.responseGroups[questionId] || 0 : 0
                            });
                        } else {
                            console.log(`Skipping response from current participant: ${item.participantId}`);
                        }
                    });
                }
            });
        }

        console.log('Formatted other responses:', JSON.stringify(otherResponses));
        return otherResponses;
    } catch (error) {
        console.error('Error fetching other responses:', error);
        // Return empty object on error to allow processing to continue
        return {};
    }
}

// Import string utils for local implementation
const { levenshteinDistance, longestCommonSubstring } = require('./string-utils');

// Local implementation of identify-duplicates Lambda function
const localIdentifyDuplicates = (s1, responses) => {
    console.log('Using local implementation of identify-duplicates');

    // Process each response with metrics
    const responsesWithMetrics = responses.map(response => {
        if (!response || typeof response !== 'object' || !response.finalState) {
            console.warn('Invalid response object, missing finalState:', response);
            return { ...response, s1, s2: '', nlev: 0, rlev: 0, nlcs: 0, rlcs: 0 };
        }

        const s2 = response.finalState;
        const maxStringLength = Math.max(s1.length, s2.length);

        // Handle edge case of empty strings
        if (maxStringLength === 0) {
            return { ...response, s1, s2, nlev: 0, rlev: 0, nlcs: 0, rlcs: 0 };
        }

        const rlev = levenshteinDistance(s1, s2);
        const nlev = rlev / maxStringLength;
        const rlcs = longestCommonSubstring(s1, s2);
        const nlcs = rlcs / maxStringLength;

        return { ...response, s1, s2, nlev, rlev, nlcs, rlcs };
    });

    return responsesWithMetrics;
};

// Call the function to identify duplicates
const batchedResponse = async (target, responses) => {
    console.log('Calling identify-duplicates function');

    try {
        // Check if we're running in local development mode
        const isLocalDevelopment = process.env.IS_OFFLINE === 'true';

        if (isLocalDevelopment) {
            // Use local implementation for local development
            console.log('Using local implementation for identify-duplicates');
            return localIdentifyDuplicates(target, responses);
        } else {
            // Call the identify-duplicates Lambda function directly
            console.log('Calling identify-duplicates Lambda function');
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
                console.error('Problem identifying duplicate responses:', body.problem || 'Unknown error');
                // Return empty array instead of throwing an error
                return [];
            }

            return body.responsesWithMetrics;
        }
    } catch (error) {
        console.error('Error calling identify-duplicates:', error);
        // Return empty array instead of throwing an error
        return [];
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
    console.log('Processing responses:', responses.length);

    // First filter for matches
    const matchingResponses = responses.filter(response => {
        const { s1, s2, nlev, rlev, nlcs, rlcs } = response;
        return checkIfMatch(s1, s2, nlev, rlev, nlcs, rlcs);
    });

    console.log('Matching responses after checkIfMatch:', matchingResponses.length);

    // Then filter for valid response groups
    const validResponses = matchingResponses.filter(response => Number.isInteger(response.responseGroup));

    console.log('Valid responses with response groups:', validResponses.length);

    return validResponses;
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

// In-memory storage for group counters in local development - make it global so it's shared between requests
global.localGroupsStorage = global.localGroupsStorage || {};
const localGroupsStorage = global.localGroupsStorage;

// Increment the group counter for the question if no duplicates are found
const getGroupValue = async (surveyId, questionId) => {
    console.log('Incrementing group counter for question:', questionId);

    try {
        // Check if we're running in local development mode
        const isLocalDevelopment = process.env.IS_OFFLINE === 'true';

        if (isLocalDevelopment) {
            // Use in-memory storage for local development
            console.log('Using in-memory storage for group counters');

            // Initialize the survey in local storage if it doesn't exist
            if (!localGroupsStorage[surveyId]) {
                localGroupsStorage[surveyId] = {};
            }

            // Initialize the question counter if it doesn't exist
            if (!localGroupsStorage[surveyId][questionId]) {
                localGroupsStorage[surveyId][questionId] = 0;
            }

            // Increment the counter
            localGroupsStorage[surveyId][questionId]++;

            console.log(`Group counter for ${surveyId}/${questionId} is now ${localGroupsStorage[surveyId][questionId]}`);

            // Return the new group counter value
            return localGroupsStorage[surveyId][questionId];
        } else {
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
        }
    } catch (error) {
        console.error('Error incrementing group counter:', error);
        // Fallback to a random value if operation fails
        return Math.floor(Math.random() * 1000) + 1;
    }
};

// Check for cross-duplicate responses within the survey
const checkForCrossDuplicateResponses = async (cleanedFinalStates, survey_id, participant_id) => {
    console.log('Checking for cross-duplicate responses');
    console.log('Survey ID:', survey_id);
    console.log('Participant ID:', participant_id);
    console.log('Cleaned final states:', JSON.stringify(cleanedFinalStates));

    // Get other responses from the survey
    const otherResponses = await getOtherResponsesFromSurvey(cleanedFinalStates, survey_id, participant_id);
    const cleanedFinalStateIds = Object.keys(cleanedFinalStates);
    const nonEmptyFinalStateIds = cleanedFinalStateIds.filter(id => cleanedFinalStates[id] !== '');

    console.log('Non-empty final state IDs:', nonEmptyFinalStateIds);

    let duplicateResponses = {};
    let responseGroups = {};

    try {
        // Batch and check for duplicates in each responses in parallel
        const allPromises = nonEmptyFinalStateIds.flatMap(id => {
            const rawResponses = otherResponses[id] || [];
            console.log(`Raw responses for ${id}:`, rawResponses.length);

            const responses = rawResponses.filter(response => {
                const shouldRun = runDuplicateCheck(cleanedFinalStates[id], response.finalState);
                console.log(`Should run duplicate check for ${id} vs ${response.participantId}:`, shouldRun);
                return shouldRun;
            });

            console.log(`Filtered responses for ${id}:`, responses.length);

            return divideArray(responses, Math.ceil(responses.length / config.maxBatchSize))
                .map(group => batchedResponse(cleanedFinalStates[id], group)
                    .then(result => {
                        console.log(`Batched response result for ${id}:`, result ? result.length : 0);
                        return [id, result];
                    }));
        });

        console.log('Number of promises:', allPromises.length);

        // Resolve all promises in parallel
        const resolvedPromises = await Promise.all(allPromises);
        console.log('Resolved promises:', resolvedPromises.length);

        const resolvedIds = new Set(resolvedPromises.map(([id, _]) => id));
        console.log('Resolved IDs:', Array.from(resolvedIds));

        // Loop through cleanedFinalStates ids and check for duplicates
        for (let i = 0; i < cleanedFinalStateIds.length; i++) {
            const id = cleanedFinalStateIds[i];
            console.log(`Processing ID: ${id}`);

            // Check if this ID's promise was resolved
            if (!resolvedIds.has(id)) {
                console.log(`ID ${id} not resolved, getting new group value`);
                duplicateResponses[id] = [];
                const groupValue = cleanedFinalStates[id] === '' ? 0 : await getGroupValue(survey_id, id);
                responseGroups[id] = groupValue;
                continue;
            }

            // Find the resolved promise for this ID
            const relevantResolvedPromise = resolvedPromises.find(([resolvedId, _]) => resolvedId === id)[1];
            console.log(`Relevant resolved promise for ${id}:`, relevantResolvedPromise ? relevantResolvedPromise.length : 0);

            const matchingResponses = processResponses(relevantResolvedPromise || []);
            console.log(`Matching responses for ${id}:`, matchingResponses.length);

            if (!matchingResponses.length) {
                console.log(`No matching responses for ${id}, getting new group value`);
                duplicateResponses[id] = [];
                const groupValue = cleanedFinalStates[id] === '' ? 0 : await getGroupValue(survey_id, id);
                responseGroups[id] = groupValue;
                continue;
            }

            console.log(`Finding best match for ${id} from ${matchingResponses.length} matching responses`);
            const bestMatchGroup = findBestMatch(matchingResponses);
            console.log(`Best match group for ${id}:`, bestMatchGroup);
            responseGroups[id] = bestMatchGroup;

            // Include all matching responses as duplicates, regardless of their response group
            // This ensures we detect cross-duplicates even if they have different response groups
            console.log(`All matching responses for ${id}:`, matchingResponses.length);
            duplicateResponses[id] = matchingResponses.map(response => response.s2);
        }

    } catch (error) {
        console.log('Error processing responses:', error);
        // Instead of throwing the error, return empty objects
        duplicateResponses = {};
        responseGroups = {};

        // Assign default response groups for all questions
        cleanedFinalStateIds.forEach(id => {
            duplicateResponses[id] = [];
            responseGroups[id] = cleanedFinalStates[id] === '' ? 0 : Math.floor(Math.random() * 1000) + 1;
        });
    }

    console.log('Duplicate responses:', JSON.stringify(duplicateResponses));
    console.log('Response groups:', JSON.stringify(responseGroups));
    return { duplicateResponses, responseGroups };
}

module.exports = { checkForCrossDuplicateResponses, checkIfMatch, localResponsesStorage };

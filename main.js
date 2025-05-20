const he = require('he');
const { levenshteinDistance, longestCommonSubstring } = require('./helpers/string-utils');
const { openAIGroupResponse, openAIEffortCategorization } = require('./helpers/openai-utils');
const { checkForCrossDuplicateResponses, checkIfMatch } = require('./helpers/cross-duplicate-utils');
const { isJsonString, parseQueryString, parseJSON } = require('./helpers/json-utils');
const config = require('./config');

// AWS SDK for DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// -- -- --
// Script starts here
// -- -- --

// Remove HTML tags from a string
const convertHTMLEntities = (str) => {
    return he.decode(str);
}

// Remove special characters from a string
const cleanFinalStateString = (str) => {
    return str.toString().toLowerCase().replace(/\n/g, ' ').replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
}

// Check for self-duplicate responses
const checkForSelfDuplicateResponses = (obj) => {
    let keys = Object.keys(obj);
    const duplicatedResponsesDict = {};
    keys.forEach(key => {
        duplicatedResponsesDict[key] = false;
    });
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            let key1 = keys[i];
            let key2 = keys[j];
            const maxStringLength = Math.max(obj[key1].length, obj[key2].length);
            if (maxStringLength === 0) continue;
            let s1 = obj[key1];
            let s2 = obj[key2];
            const rlev = levenshteinDistance(s1, s2);
            const nlev = rlev / maxStringLength;
            const rlcs = longestCommonSubstring(s1, s2);
            const nlcs = rlcs / maxStringLength;
            const match = checkIfMatch(s1, s2, nlev, rlev, nlcs, rlcs);
            if (match) {
                duplicatedResponsesDict[key1] = true;
                duplicatedResponsesDict[key2] = true;
            }
        }
    }
    return duplicatedResponsesDict;
}

// Check if two objects have the same keys
const haveSameKeys = (...args) => {
    let allKeys = args.map(obj => Object.keys(obj).sort().join(','));

    for (let i = 1; i < allKeys.length; i++) {
        if (allKeys[i] !== allKeys[0]) {
            return false;
        }
    }
    return true;
}

exports.handler = async function (event, context) {

    // Set CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // API Gateway will handle API key validation for endpoints marked as private
    // This is a secondary validation in case the API is called directly
    // For local development, we'll bypass this check
    const isLocalDevelopment = process.env.IS_OFFLINE === 'true';
    const apiKey = event.headers['x-api-key'];
    if (!isLocalDevelopment && !apiKey) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                error: true,
                problem: 'Missing API key'
            })
        };
    }

    let errorText = '';
    let problemParsingResponse = false;

    const api = async () => {

        let isValidQueryString;
        try {
            parseQueryString(event.body);
            isValidQueryString = true;
        } catch (error) {
            isValidQueryString = false;
        }

        const isValidJSON = isJsonString(event.body);

        if (!isValidJSON && !isValidQueryString) {
            errorText = `Must pass a serialized JSON object or a query string`;
            throw new Error(errorText);
        }

        // Determine which parsing function to use (decipher uses query strings)
        const parsingFunction = isValidJSON ? parseJSON : parseQueryString;

        // Parse the body
        problemParsingResponse = true;
        let { questions, survey_id, participant_id, responses, low_effort_threshold } = parsingFunction(event.body);
        const lowEffortThreshold = low_effort_threshold || 0;
        problemParsingResponse = false;

        // If any of these are undefined, raise error
        const missing = Object.entries({ questions, survey_id, participant_id, responses })
            .filter(([, v]) => v == null)          // catches undefined or null
            .map(([k]) => k);
        if (missing.length) throw new Error(`Missing ${missing.join(', ')}`);

        // If type of questions or is not object, raise error
        const nonObjects = Object.entries({ questions, responses })
            .filter(([, v]) => v === null || typeof v !== 'object')
            .map(([k]) => k);
        if (nonObjects.length) {
            throw new Error(`The following fields must be objects: ${nonObjects.join(', ')}`);
        }

        // If survey_id or participant_id are not strings, raise error
        const badStrings = Object.entries({ survey_id, participant_id })
            .filter(([, v]) => typeof v !== 'string')
            .map(([k]) => k);
        if (badStrings.length) {
            throw new Error(`The following fields must be strings: ${badStrings.join(', ')}`);
        }

        // Make sure keys of questions and responses are the same
        if (haveSameKeys(questions, responses) === false) {
            errorText = 'Questions and responses must have the same keys';
            throw new Error(errorText);
        }

        // Clean responses with convertHTMLEntities
        Object.keys(responses).forEach(id => {
            responses[id] = convertHTMLEntities(responses[id]);
        });

        // Clean the responses for duplicate matching
        const cleanedResponses = {};
        Object.keys(responses).forEach(id => {
            cleanedResponses[id] = cleanFinalStateString(responses[id]);
        });

        // Start duplication promise
        const duplicateResponsePromise = checkForCrossDuplicateResponses(cleanedResponses, survey_id, participant_id);

        // Start categorization but do not wait for it to complete
        const uniqueIds = Object.keys(questions);
        const categorizationPromises = uniqueIds.map(id => {
            return openAIGroupResponse(questions[id], responses[id])
                .then(({ result }) => {
                    return { id, result };
                })
                .catch(error => {
                    console.error(`Error in OpenAI categorization for ${id}:`, error);
                    // Return a default value in case of error
                    return { id, result: 'Valid' };
                });
        });
        const lowEffortPromises = uniqueIds.map(id => {
            return openAIEffortCategorization(questions[id], responses[id])
                .then(({ result }) => {
                    return { id, result };
                })
                .catch(error => {
                    console.error(`Error in OpenAI effort categorization for ${id}:`, error);
                    // Return a default value in case of error
                    return { id, result: '5' };
                });
        });

        const selfDuplicateResponses = checkForSelfDuplicateResponses(cleanedResponses);

        // Wait for duplication results from duplicatedResponsesPromise
        const { duplicateResponses, responseGroups } = await duplicateResponsePromise;

        // Wait for categorization results
        const openAIResults = await Promise.all(categorizationPromises);
        const lowEffortResults = await Promise.all(lowEffortPromises);

        // Initialize checks, effort ratings and categorization results
        const checks = {};
        uniqueIds.forEach(id => { checks[id] = [] });
        const effortRatings = {};
        const failureTypes = ["Profane", "Off-topic", 'Gibberish', 'GPT'];

        // Loop through the results and categorize them
        Object.keys(questions).forEach(id => {
            // -- OpenAI categorizations --
            const openAIResult = openAIResults.find(result => result.id === id);
            console.log(`OpenAI categorization for ${id}:`, openAIResult ? openAIResult.result : 'undefined');

            // Apply categorization flags based on OpenAI results
            if (openAIResult && typeof openAIResult.result === 'string') {
                const result = openAIResult.result;

                // Check for each failure type
                if (result === 'GPT') {
                    checks[id].push('GPT');
                } else if (result === 'Profane') {
                    checks[id].push('Profane');
                } else if (result === 'Gibberish') {
                    checks[id].push('Gibberish');
                } else if (result === 'Off-topic') {
                    checks[id].push('Off-topic');
                }
            }

            // -- Effort ratings --
            const effortResult = lowEffortResults.find(result => result.id === id);
            if (effortResult) {
                try {
                    const effortRating = parseInt(effortResult.result);
                    if (!isNaN(effortRating) && effortRating <= lowEffortThreshold) {
                        if (responses[id].length > 0) {
                            checks[id].push('Low-effort');
                        }
                    }
                    effortRatings[id] = effortRating;
                } catch (error) {
                    console.error(`Error parsing effort rating for ${id}:`, error);
                    effortRatings[id] = 0;
                }
            } else {
                effortRatings[id] = 0;
            }
        });

        // Add cross duplicate response to checks
        Object.keys(duplicateResponses).forEach(id => {
            if (typeof responses[id] !== 'string' || responses[id].length < 20) return;
            if (duplicateResponses[id].length > 0) checks[id].push('Cross-duplicate response');
        });

        // Add self duplicate response to checks
        Object.keys(selfDuplicateResponses).forEach(id => {
            if (typeof responses[id] !== 'string') return;
            if (selfDuplicateResponses[id]) checks[id].push('Self-duplicate response');
        });

        const returnBody = {
            error: false,
            checks,
            response_groups: responseGroups,
            effort_ratings: effortRatings,
        };

        // Store the response in DynamoDB for future cross-duplicate checks
        try {
            await storeResponseInDynamoDB(survey_id, participant_id, responses, responseGroups);
            console.log('Successfully stored response in DynamoDB');
        } catch (error) {
            console.error('Error storing response in DynamoDB:', error);
            // Continue even if storing fails - we don't want to fail the request
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(returnBody),
        }
    };

// In-memory storage for local development - make it global so it's shared between requests
global.localResponsesStorage = global.localResponsesStorage || {};
const localResponsesStorage = global.localResponsesStorage;

    // Store the response in DynamoDB for future cross-duplicate checks
    const storeResponseInDynamoDB = async (surveyId, participantId, responses, responseGroups) => {
        console.log('Storing response in DynamoDB');
        console.log('Survey ID:', surveyId);
        console.log('Participant ID:', participantId);

        try {
            // Check if we're running in local development mode
            const isLocalDevelopment = process.env.IS_OFFLINE === 'true';

            if (isLocalDevelopment) {
                // Use in-memory storage for local development
                console.log('Using in-memory storage for local development');

                // Initialize the survey in local storage if it doesn't exist
                if (!localResponsesStorage[surveyId]) {
                    localResponsesStorage[surveyId] = [];
                }

                // Add the response to local storage
                localResponsesStorage[surveyId].push({
                    surveyId: surveyId,
                    participantId: participantId,
                    responses: responses,
                    responseGroups: responseGroups,
                    timestamp: new Date().toISOString()
                });

                console.log('Successfully stored response in local storage');
                console.log('Local storage now contains:', localResponsesStorage[surveyId].length, 'items for survey', surveyId);

                // Make the local storage available to the cross-duplicate-utils module
                const crossDuplicateUtils = require('./helpers/cross-duplicate-utils');
                if (crossDuplicateUtils.localResponsesStorage) {
                    crossDuplicateUtils.localResponsesStorage = localResponsesStorage;
                }
            } else {
                // Prepare the item to store in DynamoDB
                const params = {
                    TableName: process.env.RESPONSES_TABLE || 'SurveyResponses',
                    Item: {
                        surveyId: surveyId,
                        participantId: participantId,
                        responses: responses,
                        responseGroups: responseGroups,
                        timestamp: new Date().toISOString()
                    }
                };

                console.log('DynamoDB put params:', JSON.stringify(params));

                // Store the item in DynamoDB
                await ddbDocClient.send(new PutCommand(params));

                console.log('Successfully stored response in DynamoDB');
            }
        } catch (error) {
            console.error('Error storing response in DynamoDB:', error);
            throw error;
        }
    };

    const requestTimedOutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            errorText = 'Request timed out';
            reject(new Error(errorText));
        }, config.TIMEOUT_MS);
    });

    const mainLogicPromise = api();

    return Promise.race([mainLogicPromise, requestTimedOutPromise])
        .catch(error => {
            console.error(error);
            const errorTextForReturn = errorText === '' ? problemParsingResponse ? 'Problem parsing request body' : "An unknown error occured" : errorText;
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: true,
                    problem: errorTextForReturn,
                })
            }
        });
}

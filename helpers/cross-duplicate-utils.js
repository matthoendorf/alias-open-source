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

// Get the other responses other participants have given to the survey
const getOtherResponsesFromSurvey = async (cleanedFinalStates, surveyId) => {
    console.log('This function should get other responses from the survey:', surveyId);
    const otherResponses = {}; // This is a placeholder. Replace with actual logic to get other responses.
    Object.keys(otherResponses).forEach(key => {
        const cleanedFinalState = cleanFinalStates(cleanedFinalStates[key]);
        otherResponses[key] = {
            finalState: cleanedFinalState,
            participantId: 'participantId', // Placeholder for actual participant ID
            responseGroup: 0
        };
    });

    return otherResponses
}

// Call the function to identify duplicates
const batchedResponse = async (target, responses) => {
    console.log('This function should call identify-duplicates.js on the server');
    // Get file in ./identify-duplicates.js
    const response = await fetch('https://api.example.com/identify-duplicates', {
        method: 'POST',
        body: JSON.stringify({ s1: target, responses }),
    });
    const { responsesWithMetrics, error } = await response.json();
    if (error) {
        throw new Error('Problem identifying duplicate responses');
    }
    return responsesWithMetrics;
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
    console.log('This function should increment the group counter for question:', questionId);
    return Math.floor(Math.random() * 1000) + 1; // Placeholder for actual logic to get group value
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

            const duplicates = matchingResponses.filter(response => response.responseGroup === mostCommonGroupValue);
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
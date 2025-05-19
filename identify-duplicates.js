const {levenshteinDistance, longestCommonSubstring} = require('./helpers/string-utils');

exports.handler = async function (event, context) {

    // Set CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST"
    };

    try {
        // Parse the request body
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            throw new Error('Invalid JSON in request body');
        }

        const { s1, responses } = parsedBody;

        // Validate required parameters
        if (!s1) {
            throw new Error('Missing required parameter: s1');
        }
        if (!responses || !Array.isArray(responses)) {
            throw new Error('Missing or invalid parameter: responses (must be an array)');
        }

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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ responsesWithMetrics, error: false }),
        }

    } catch (error) {
        console.error('Error in identify-duplicates handler:', error);
        const errorTextForReturn = error.message || "An error occurred while processing the request";
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: true,
                problem: errorTextForReturn,
            })
        }
    }
}

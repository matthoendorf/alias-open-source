const {levenshteinDistance, longestCommonSubstring} = require('./helpers/string-utils');

exports.handler = async function (event, context) {

    // Set CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST"
    };

    try {

        const { s1, responses } = JSON.parse(event.body);

        const responsesWithMetrics = responses.map(response => {
            const s2 = response.finalState;
            const maxStringLength = Math.max(s1.length,s2.length);
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

        console.log(error);
        console.log(errorTextForReturn);

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

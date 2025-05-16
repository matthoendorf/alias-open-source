const querystring = require('querystring');
const sanitizeHtml = require('sanitize-html');

// Check if a string is a valid JSON
const isJsonString = (input) => {
    try {
        parseJSON(input);
        return true;
    } catch (error) {
        return false;
    }
}

// Parse query string into an object
const parseQueryString = (str) => {
    const { questions, survey_id, participant_id, responses, low_effort_threshold } = querystring.parse(str);
    const parsedQuestions = JSON.parse(questions);
    const parsedResponses = JSON.parse(responses);
    return {
        questions: parsedQuestions,
        responses: parsedResponses,
        survey_id, participant_id, low_effort_threshold
    };
}

// Remove control characters from a string
const escapeControlCharacters = (str) => {
    try {
        const newString = str.replace(/[\t\n\r]/g, function (match) {
            if (match === '\t') return '\\t';
            if (match === '\n') return '\\n';
            if (match === '\r') return '\\r';
        });
        return JSON.parse(newString);
    } catch (error) {
        throw new Error('Failed to escape control characters');
    }
}

// Escape newlines in string values
const escapeNewlinesInStringValues = (jsonString) => {
    try {
        const newString = jsonString.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
            return match.replace(/\n/g, "\\n");
        });
        return JSON.parse(newString);
    } catch (error) {
        throw new Error('Failed to escape newlines in string values');
    }
}

// Helper function to log errors and continue to the next parser
const attemptParsing = (parsingFunction, str) => {
    try {
        return { result: parsingFunction(str), error: false };
    } catch (error) {
        console.error(`${parsingFunction.name} failed`);
        return { error: true };
    }
};

// Function to parse JSON with multiple strategies
const parseJSON = (str, is_first = true) => {
    const parsingFunctions = [
        JSON.parse,
        escapeControlCharacters,
        escapeNewlinesInStringValues,
    ];

    // Try parsing with the standard functions
    for (const func of parsingFunctions) {
        const { result, error } = attemptParsing(func, str);
        if (!error) return result;
    }

    // Special handling with sanitizeHtml only on the first attempt
    if (is_first) {
        try {
            const sanitizedStr = sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });
            console.error("sanitizeHtml applied, trying JSON.parse again");
            return parseJSON(sanitizedStr, false);
        } catch (error) {
            console.error("sanitizeHtml failed, no more parsing strategies left");
        }
    }

    // If all parsing functions and sanitizeHtml fail
    throw new Error('Failed to parse JSON');
};

module.exports = {isJsonString, parseQueryString, parseJSON };
const OpenAI = require("openai");
const { groupResponsePrompt, effortPrompt } = require('./prompts');
const config = require('../config');

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.API_SECRET.replace("Bearer ", "") });

// Call OpenAI API to categorize the response
const openAIGroupResponse = async (question, userResponse) => {

    if (userResponse === '') return { result: 'Valid' };

    const messages = [
        ...groupResponsePrompt,
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": `Survey ID: sxRGirIK\nParticipant ID: F6nDnJLE\n--\nQuestion: ${question}\nResponse: ${userResponse}`
                }
            ]
        }
    ];

    const response = await callOpenAI(messages);
    return response;
}


// Call OpenAI API to assign an effort score
const openAIEffortCategorization = async (question, userResponse) => {

    if (userResponse === '') return { result: '0' };

    const messages = [
        ...effortPrompt,
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": `Survey ID: sxRGirIK\nParticipant ID: F6nDnJLE\n--\nQuestion: ${question}\nResponse: ${userResponse}`
                }
            ]
        },
    ];

    const response = await callOpenAI(messages);
    return response;

}

// Call the OpenAI API
const callOpenAI = async (messages) => {
    try {
        const response = await openai.chat.completions.create({
            model: config.openAIModel,
            messages,
            temperature: 0,
            max_tokens: 10,
            top_p: 1
        });

        let content = response.choices[0].message.content.trim();
        console.log('Original OpenAI response:', content);

        // Normalize the content to ensure consistent categorization
        // This is critical for the categorization flags to work properly
        const lowerContent = content.toLowerCase();

        // Exact matching for categorization types
        if (lowerContent === 'gpt') {
            content = 'GPT';
        } else if (lowerContent === 'profane') {
            content = 'Profane';
        } else if (lowerContent === 'gibberish') {
            content = 'Gibberish';
        } else if (lowerContent === 'off-topic' || lowerContent === 'off topic') {
            content = 'Off-topic';
        } else if (lowerContent === 'valid') {
            content = 'Valid';
        } else {
            // Fallback to partial matching if exact match fails
            if (lowerContent.includes('gpt')) {
                content = 'GPT';
            } else if (lowerContent.includes('profane')) {
                content = 'Profane';
            } else if (lowerContent.includes('gibberish')) {
                content = 'Gibberish';
            } else if (lowerContent.includes('off-topic') || lowerContent.includes('off topic')) {
                content = 'Off-topic';
            } else if (lowerContent.includes('valid')) {
                content = 'Valid';
            }
        }

        console.log('Normalized response:', content);
        return { result: content };
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        // Return a default value in case of error
        return { result: 'Valid' };
    }
};

module.exports = { openAIGroupResponse, openAIEffortCategorization };

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

    const response = await openai.chat.completions.create({
        model: config.openAIModel,
        messages,
        temperature: 0,
        max_tokens: 10,
        top_p: 1
    });

    const content = response.choices[0].message.content.trim();
    return { result: content };
};

module.exports = { openAIGroupResponse, openAIEffortCategorization };
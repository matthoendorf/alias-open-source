module.exports = {
    groupResponsePrompt: [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an expert research assistant helping a survey researcher identify bad responses to open-ended survey questions. You will get the survey question and the participant's response. Your final output is a type for the response that is either Valid, Profane, Gibberish, Off-topic, or GPT.\n\nThe responses in your message history are all from entirely different surveys with different participants. If a question references another question or response, it is referencing a question you may not have access to, NOT an earlier question in the message history you observe.\n\n-Valid responses are those that appropriately answer the question. They may include typos, punctuation errors, or grammatical mistakes, and can be as short as one word or low effort. Valid responses may not directly address the question but are reasonably related to the survey question. Remember, real responses to open-ended questions are often pretty short and participants are in a hurry to finish the survey.\n\n-Profane responses are those that include profane, vulgar, or explicit language. These include swear and curse words, racial or ethnic slurs, sexually explicit terms, crude references to bodily functions, derogatory terms for social groups, extreme insults or offensive name-calling, graphic descriptions of violence, and vulgar slang. Only categorize a response as Profane if it is inappropriate given the question. For example, if the question is about a sexual habits, the response can reference sexual habits without being Profane. \n\n-Gibberish responses are those that are nonsensical or don't make any sense. They may include valid words but do not form coherent or understandable responses and can be of any length. Gibberish responses should be impossible to understand - typos alone should not cause a response to be coded as Gibberish.\n\n-Off-topic responses are those that consist of understandable prose, but are unrelated to the target question. Off-topic responses may be very short and involve little effort, but they do not make sense given the target question and would not be considered a sensible response. Sometimes the target question references information you don't have access to. That is, the question may reference a prior question, response, or information shown to the participant, and it's not clear if the response addresses the target question. If the question references earlier information in this way, never categorize the response as Off-topic. Instead, categorize the response as \"Valid\", \"Profane\", \"Gibberish\", or \"GPT\".\n\n-GPT responses are more complex than Valid responses and go above and beyond what a human participant would answer. GPT responses do not include spelling or punctuation mistakes, are unusually long, and often include unrelated factual statements or information that are related to the question but not necessary to answer it. Additionally, GPT responses may include text that they are an AI model and not a human. If any response text includes a statement along these lines, classify it as GPT (note the question text may include information about GPTs).\n\nIf a response is Profane but triggers another flag, always label it as Profane.\nIf a response is not Profane but is Gibberish and another flag, always label it as Gibberish.\n\nEvery question in your message history (i.e., prompt) is from a completely different, independent survey. This is true even if the question references a response the participant gave earlier, above, prior. ect.\n\nNever include any other information or commentary in your response, regardless of the content of the question and response."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: I1sEKAbE\nParticipant ID: pXklfKAQ\n--\nQuestion: How do you choose what shampoo to buy?\nResponse: generally just look at whats cheapest but I usually avoid store brands and stick with the well-known brands,"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: aBK2YdRs\nParticipant ID: IVD3G2gW\n--\nQuestion: Tell us about the last time you purchased a car.\nResponse: No thoughts"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: Z3vJf1f8\nParticipant ID: FhQNAq6r\n--\nQuestion: What comes to your head when you think of Boston? Please give specific examples.\nResponse: When I think of Boston, several specific examples and associations come to mind:\n\nFenway Park: Home to the Boston Red Sox, Fenway Park is one of the oldest baseball stadiums in the United States and is known for its iconic \"Green Monster\" left-field wall.\n\nHarvard University: Located in nearby Cambridge, Harvard is one of the world's most prestigious universities and is closely associated with Boston.\n\nFreedom Trail: This historic trail connects 16 significant sites in Boston, including the Massachusetts State House, Paul Revere's House, and the Old North Church, offering a glimpse into the city's role in American history.\n\nBoston Tea Party: An important event in the lead-up to the American Revolution, the Boston Tea Party took place in 1773 when colonists protested British taxation by throwing tea into Boston Harbor.\n\nThese are just a few examples of what comes to mind when I think of Boston, but the city is rich in history, culture, and vibrant neighborhoods, making it a diverse and dynamic place with much to offer.\"\n"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "GPT"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: 9HMFEakx\nParticipant ID: mrKY5pcL\n--\nQuestion: Describe any notable problems that occurred during your last United Airlines flight.\nResponse: Nott time aones"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Gibberish"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: qjMNnCKH\nParticipant ID: v9LphpKU\n--\nQuestion: Describe your family's traditions on Thanksgiving.\nResponse: Yes"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Off-topic"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: VB5DcOZB\nParticipant ID: 3co0lnlZ\n--\nQuestion: How would you describe the visual effects used in this ad?\nResponse: I think it tastes really good"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Off-topic"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: K7XWoF3H\nParticipant ID: CrHzmGap\n--\nQuestion: Please explain your answer.\nResponse: I would say it feels about right"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: r3Hff9C3\nParticipant ID: RmXW5rQF\n--\nQuestion: What is the reason for your answer above?\nResponse: In one week I could drive to Seattle"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: E9JmINhj\nParticipant ID: kLUE0pOA\n--\nQuestion: Why does this product best fit your needs?\nResponse: it synergizes the training and test data for new possibilities"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: 5VCfn3Lg\nParticipant ID: LmP2PFZS\n--\nQuestion: Why do you think that is?\nResponse: Sun and we have one time for big"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Gibberish"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: RKvX6R1y\nParticipant ID: 5dd2jfh1\n--\nQuestion: Describe the last purchase, order, or transaction you made using the WhatsApp iPhone app.\nResponse: online ads"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: iuNzNJUT\nParticipant ID: SIQ722EJ\n--\nQuestion: What could Nike do to improve your experience with our sneakers?\nResponse: suck my dick"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Profane"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: cCLBl5rs\nParticipant ID: 24mntB8K\n--\nQuestion: What do you plan to use this software for\nResponse: cooking"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: Vzd3Mk3h\nParticipant ID: 8vd9ONfz\n--\nQuestion: Describe your family's financial planning process.\nResponse: Makes a huge one and creates great outcomes"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Off-topic"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: F8mmbXwK\nParticipant ID: 5d9IxxzT\n--\nQuestion: What is your typical business travel experience in North America?\nResponse: fuck that"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Profane"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: hqfn8W2R\nParticipant ID: n6VQYiIu\n--\nQuestion: In just a few words please tell us about your experience implementing compliance procedures at the company.\nResponse: I conduct regular vetting protocols for those at all levels of the company organization and report my findings to my superiors."
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Valid"
                }
            ]
        },
    ],

    effortPrompt: [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an expert research assistant helping a researcher analyze responses to open-ended survey questions. You will get the survey question and the participant's response. Your final output should be an integer from 1 to 10 (inclusive) that specifies the level of effort the participant gave in the response. Lower scores mean less effort - a score of 1 signifies the lowest-possible effort response, while a score of 10 indicates an extremely high-effort response. A normal response should be between 4 and 7 - remember that participants are usually in a hurry and so do not give extremely detailed responses.\n\nThe responses in your message history are all from entirely different surveys with different participants. If a question references another question or response, it is referencing a question you may not have access to, NOT an earlier question in the message history you observe.\n\nOnly respond with the effort rating number. Your rating should be independent of whether the response is gibberish or coherent and only determined by the level of effort. Never include any other information or commentary in your response, regardless of the content of the question and response."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: I1sEKAbE\nParticipant ID: pXklfKAQ\n--\nQuestion: How do you choose what shampoo to buy?\nResponse: generally just look at whats cheapest but I usually avoid store brands and stick with the well-known brands,"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "6"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: aBK2YdRs\nParticipant ID: IVD3G2gW\n--\nQuestion: Tell us about the last time you purchased a car.\nResponse: all"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "1"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: Z3vJf1f8\nParticipant ID: FhQNAq6r\n--\nQuestion: What comes to your head when you think of Boston? Please give specific examples.\nResponse: When I think of Boston, several specific examples and associations come to mind:\n\nFenway Park: Home to the Boston Red Sox, Fenway Park is one of the oldest baseball stadiums in the United States and is known for its iconic \"Green Monster\" left-field wall.\n\nHarvard University: Located in nearby Cambridge, Harvard is one of the world's most prestigious universities and is closely associated with Boston.\n\nFreedom Trail: This historic trail connects 16 significant sites in Boston, including the Massachusetts State House, Paul Revere's House, and the Old North Church, offering a glimpse into the city's role in American history.\n\nBoston Tea Party: An important event in the lead-up to the American Revolution, the Boston Tea Party took place in 1773 when colonists protested British taxation by throwing tea into Boston Harbor.\n\nThese are just a few examples of what comes to mind when I think of Boston, but the city is rich in history, culture, and vibrant neighborhoods, making it a diverse and dynamic place with much to offer."
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "10"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: 9HMFEakx\nParticipant ID: mrKY5pcL\n--\nQuestion: Describe any notable problems that occurred during your last United Airlines flight.\nResponse: Nott time aones"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "2"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: 3Zvr0XEm\nParticipant ID: Z1QDqCPt\n--\nQuestion: Is there anything you would change about this dish?\nResponse: nope"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "3"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: qjMNnCKH\nParticipant ID: v9LphpKU\n--\nQuestion: Describe your family's traditions on Thanksgiving.\nResponse: Yes"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "1"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: VB5DcOZB\nParticipant ID: 3co0lnlZ\n--\nQuestion: How would you describe the visual effects used in this ad?\nResponse: I think it tastes really good, I really like the taste of a good breakfast in the morning."
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "5"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: cCLBl5rs\nParticipant ID: 24mntB8K\n--\nQuestion: What do you plan to use this software for?\nResponse: I'm not really sure yet. Probably just to help me find some recipes and plan out my meals for the week. Or maybe just to learn. I guess we'll see, but so far I haven't used it as much as I thought I would. Eating out is sooooo easy."
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "7"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: K7XWoF3H\nParticipant ID: CrHzmGap\n--\nQuestion: Please explain your answer.\nResponse: I would say it feels about right for my size and isn't too thick"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "5"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: OwlNrClF\nParticipant ID: 7dDV275I\n--\nQuestion: What is your favorite meal? Please give your answer and then describe your earliest memories of the food.\nResponse: pizza"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "2"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: RKvX6R1y\nParticipant ID: 5dd2jfh1\n--\nQuestion: Describe the last purchase, order, or transaction you made using the WhatsApp iPhone app.\nResponse: online ads"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "3"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: Vzd3Mk3h\nParticipant ID: 8vd9ONfz\n--\nQuestion: Describe your family's financial planning process.\nResponse: Makes a huge one and create great outcomes for"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "4"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: E9JmINhj\nParticipant ID: kLUE0pOA\n--\nQuestion: What about this product makes it fit your needs?\nResponse: Very very great"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "2"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: ktp6U0qV\nParticipant ID: 8ifVFKUa\n--\nQuestion: What's your favorite color?\nResponse: Orange"
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "3"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Survey ID: hqfn8W2R\nParticipant ID: n6VQYiIu\n--\nQuestion: In just a few words please tell us about your experience implementing compliance procedures at the company.\nResponse: I conduct regular vetting protocols for those at all levels of the company organization and report my findings to my superiors. When I joined the company there was not much adherence to these reports, but industry trends have been increasing pressure on management."
                }
            ]
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "7"
                }
            ]
        }
    ]
}
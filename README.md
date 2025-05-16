<p align="center">
<img src="assets/logo-black.png" alt="Roundtable Logo" width = '80'>
</p>

<h3 align="center">Roundtable Alias Open Source</h3>

This repo contains code for the open-end quality checks that were part of the original Roundtable Alias API.

* **Categorizations**  
  Uses OpenAI chat completions to label a response as one of Valid, Profane, Off-topic, Gibberish, and GPT. The model uses the survey question and response and returns a single word corresponding to the categorization.

* **Effort scores**  
  Uses OpenAI to rate the response 1 – 10 (0 when the answer is empty). Scores of 4–7 are typical. Lower means minimal effort, and higher signals unusually detailed writing which may be GPT-generated.

* **Duplicate matching**  
 Duplicate matching uses string-distance methods (Levenshtein distance and longest-common-substring) to identify and group likely duplicates.

  * **Self duplicates** are within the same participant; any length triggers a flag.  
  * **Cross duplicates** compare against other participants' answers to the same question.  
    * If the response is at least 20 characters and passes the distance/LCS thresholds, it is flagged and assigned to the most similar response group.  
    * If a response is less than 20 characters but still matches an existing group, it inherits that group ID without being flagged.  
    * A non-matching answer starts its own group.

---

### Where are the behavioral bot checks?

The open-source package covers only content checks from Alias. Our full behavioral analytics and bot-detection suite (unnatural typing, mouse telemetry, etc.) is available in the new product. You can integrate this in your survey in under 5 minutes. To get started for free, create an account at [accounts.roundtable.ai](https://accounts.roundtable.ai).

## Organization

```
├── config.js                 # thresholds / model / timeouts
├── identify-duplicates.js    # server-side endpoint hit by helpers
├── helpers
│   ├── cross-duplicate-utils.js
│   ├── json-utils.js
│   ├── openai-utils.js
│   ├── prompts.js
│   └── string-utils.js
└── main.js                   # Netlify-style handler that orchestrates everything
```

### Quick start

```
git clone <repo>
cd alias-open-source
npm install                     # installs openai, he, sanitize-html, …
export API_SECRET="Bearer sk-…" # your OpenAI key
node main.js                    # or deploy as a Netlify / labmda function
```

## Configuration

### config.js glossary

* **TIMEOUT_MS**  
  Hard stop (in milliseconds) for the entire Lambda / Netlify-function run.  
  If the handler doesn't return in this time the request is rejected with “Request timed out”.

* **normLevThreshold**  
  Maximum *normalised* Levenshtein distance (0 – 1). If the distance between two answers is less than or equal to `normLevThreshold`, they count as duplicates.

* **rawLevThreshold**  
  Maximum *raw* Levenshtein distance (absolute character edits). If the distance is less than or equal to `rawLevThreshold`, the answers count as duplicates (except for ultra-short strings).

* **normLCSThreshold**  
  Minimum *normalised* longest-common-substring (LCS) ratio (0 – 1). If the ratio is greater than or equal to `normLCSThreshold`, the pair is treated as a duplicate.

* **rawLCSThreshold**  
  Minimum absolute LCS length (characters). If two answers share at least `rawLCSThreshold` consecutive characters, they are flagged as duplicates.

* **maxBatchSize**  
  When checking a target answer against other responses, we chunk that list into batches no larger than this before sending them to `identify-duplicates.js`.  

* **openAIModel**  
  Name of the OpenAI chat model used for quality classification and effort scoring (defaults to `"gpt-4o"`).

### Still to implement

These helper functions are intentionally left blank as they require integration with your database and server. You must complete them before the pipeline will run end-to-end:

* **getGroupValue** (`helpers/cross-duplicate-utils.js`) – returns and increments the next group index for a question when no duplicates are found
* **getOtherResponsesFromSurvey** (`helpers/cross-duplicate-utils.js`) – fetches existing answers for the same survey from your database
* **batchedResponse** (`helpers/cross-duplicate-utils.js`) – POST a chunk of responses to `identify-duplicates.js` and return metrics for each response
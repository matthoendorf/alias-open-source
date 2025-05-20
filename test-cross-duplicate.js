/**
 * Test script for the Roundtable Alias API's cross-duplicate detection
 *
 * This script tests the cross-duplicate detection functionality by sending multiple
 * requests with similar responses and checking if they are correctly flagged as
 * cross-duplicates and assigned to the same response group.
 *
 * Usage:
 * 1. Make sure you have started the local development server with `npm run dev`
 * 2. Run this script with `node test-cross-duplicate.js`
 */

const http = require('http');

// Generate a unique survey ID for this test run
const uniqueSurveyId = `test-survey-cross-duplicate-${Date.now()}`;
console.log(`Using unique survey ID: ${uniqueSurveyId}`);

// Function to send a request to the API
const sendRequest = (testData) => {
  return new Promise((resolve, reject) => {
    // Options for the HTTP request
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/dev',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Create the request
    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

      let data = '';

      // A chunk of data has been received
      res.on('data', (chunk) => {
        console.log(`CHUNK: ${chunk}`);
        data += chunk;
      });

      // The whole response has been received
      res.on('end', () => {
        try {
          console.log(`COMPLETE RESPONSE DATA: ${data}`);
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          console.error('Error parsing JSON response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      console.error('Error making request:', error.message);
      reject(error);
    });

    // Write the request body
    req.write(JSON.stringify(testData));

    // End the request
    req.end();

    console.log('Test data:');
    console.log(JSON.stringify(testData, null, 2));
  });
};

// Function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
const runTest = async (testName) => {
  console.log(`Running test: ${testName}`);

  // Test data for the first participant
  const testData1 = {
    questions: {
      q1: "What is your favorite color?",
      q2: "Describe your ideal vacation."
    },
    survey_id: uniqueSurveyId,
    participant_id: "test-participant-1",
    responses: {
      q1: "Blue",
      q2: "A relaxing beach vacation with plenty of sunshine and good food. I enjoy swimming in the ocean and exploring local culture."
    },
    low_effort_threshold: 3
  };

  // Test data for the second participant (similar response for q2)
  const testData2 = {
    questions: {
      q1: "What is your favorite color?",
      q2: "Describe your ideal vacation."
    },
    survey_id: uniqueSurveyId,
    participant_id: "test-participant-2",
    responses: {
      q1: "Green",
      q2: "A relaxing beach vacation with plenty of sunshine and good food. I enjoy swimming in the ocean and exploring local culture."
    },
    low_effort_threshold: 3
  };

  // Test data for the third participant (different response)
  const testData3 = {
    questions: {
      q1: "What is your favorite color?",
      q2: "Describe your ideal vacation."
    },
    survey_id: uniqueSurveyId,
    participant_id: "test-participant-3",
    responses: {
      q1: "Red",
      q2: "A mountain retreat with hiking trails and cozy cabins. I prefer cooler weather and beautiful scenery."
    },
    low_effort_threshold: 3
  };

  console.log('\nSending first request to establish baseline responses...');
  const response1 = await sendRequest(testData1);
  console.log('\nAPI Response for participant 1:');
  console.log(JSON.stringify(response1, null, 2));

  console.log('\nSending second request with similar responses to test cross-duplicate detection...');
  const response2 = await sendRequest(testData2);
  console.log('\nAPI Response for participant 2:');
  console.log(JSON.stringify(response2, null, 2));

  console.log('\nSending third request with different responses...');
  const response3 = await sendRequest(testData3);
  console.log('\nAPI Response for participant 3:');
  console.log(JSON.stringify(response3, null, 2));

  // Calculate metrics for comparison
  console.log('\n\n=== RESPONSE METRICS ===');
  const cleanedResponse1 = testData1.responses.q2.toLowerCase().replace(/\n/g, ' ').replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
  const cleanedResponse2 = testData2.responses.q2.toLowerCase().replace(/\n/g, ' ').replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
  const cleanedResponse3 = testData3.responses.q2.toLowerCase().replace(/\n/g, ' ').replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');

  console.log(`Cleaned Response 1: ${cleanedResponse1}`);
  console.log(`Cleaned Response 2: ${cleanedResponse2}`);
  console.log(`Cleaned Response 3: ${cleanedResponse3}`);

  // Calculate Levenshtein distance and LCS for response 1 vs 2
  const levenshtein = (a, b) => {
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const lcs = (a, b) => {
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    let result = 0;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
          result = Math.max(result, matrix[i][j]);
        }
      }
    }
    return result;
  };

  const rlev12 = levenshtein(cleanedResponse1, cleanedResponse2);
  const maxLen12 = Math.max(cleanedResponse1.length, cleanedResponse2.length);
  const nlev12 = rlev12 / maxLen12;
  const rlcs12 = lcs(cleanedResponse1, cleanedResponse2);
  const nlcs12 = rlcs12 / maxLen12;

  console.log('\nResponse 1 vs Response 2 Metrics:');
  console.log(`Raw Levenshtein Distance (rlev): ${rlev12}`);
  console.log(`Normalized Levenshtein Distance (nlev): ${nlev12.toFixed(4)}`);
  console.log(`Raw Longest Common Substring (rlcs): ${rlcs12}`);
  console.log(`Normalized Longest Common Substring (nlcs): ${nlcs12.toFixed(4)}`);

  const rlev13 = levenshtein(cleanedResponse1, cleanedResponse3);
  const maxLen13 = Math.max(cleanedResponse1.length, cleanedResponse3.length);
  const nlev13 = rlev13 / maxLen13;
  const rlcs13 = lcs(cleanedResponse1, cleanedResponse3);
  const nlcs13 = rlcs13 / maxLen13;

  console.log('\nResponse 1 vs Response 3 Metrics:');
  console.log(`Raw Levenshtein Distance (rlev): ${rlev13}`);
  console.log(`Normalized Levenshtein Distance (nlev): ${nlev13.toFixed(4)}`);
  console.log(`Raw Longest Common Substring (rlcs): ${rlcs13}`);
  console.log(`Normalized Longest Common Substring (nlcs): ${nlcs13.toFixed(4)}`);

  // Get config values
  const config = require('./config');
  console.log('\nConfig Thresholds (updated):');
  console.log(`normLevThreshold: ${config.normLevThreshold} (lower means more similar)`);
  console.log(`rawLevThreshold: ${config.rawLevThreshold} (lower means more similar)`);
  console.log(`normLCSThreshold: ${config.normLCSThreshold} (higher means more similar)`);
  console.log(`rawLCSThreshold: ${config.rawLCSThreshold} (higher means more similar)`);

  // Check if the responses should be compared based on the shouldRunMetric function
  console.log('\nPreliminary Check (should responses be compared):');
  console.log('Response 1 vs 2:');
  const longer12 = Math.max(cleanedResponse1.length, cleanedResponse2.length);
  const shorter12 = Math.min(cleanedResponse1.length, cleanedResponse2.length);
  const diff12 = longer12 - shorter12;
  console.log(`- Longer length: ${longer12}`);
  console.log(`- Shorter length: ${shorter12}`);
  console.log(`- Length difference: ${diff12}`);
  console.log(`- Normalized length difference: ${(diff12 / longer12).toFixed(4)}`);

  // Check each condition in the shouldRunMetric function
  const condition1 = diff12 / longer12 <= config.normLevThreshold;
  const condition2 = !(longer12 > 5 && diff12 >= config.rawLevThreshold);
  const condition3 = shorter12 >= config.rawLCSThreshold;
  const condition4 = shorter12 / longer12 >= config.normLCSThreshold;

  console.log(`- Condition 1 (diff/longer <= ${config.normLevThreshold}): ${condition1}`);
  console.log(`- Condition 2 (!(longer > 5 && diff >= ${config.rawLevThreshold})): ${condition2}`);
  console.log(`- Condition 3 (shorter >= ${config.rawLCSThreshold}): ${condition3}`);
  console.log(`- Condition 4 (shorter/longer >= ${config.normLCSThreshold}): ${condition4}`);
  console.log(`- All conditions met: ${condition1 && condition2 && condition3 && condition4}`);

  // Run additional tests to analyze the issue
  console.log('\nRunning test 1 for analysis...');
  const testData4 = {
    ...testData1,
    participant_id: "test-participant-4"
  };
  const response4 = await sendRequest(testData4);

  console.log('\nRunning test 2 for analysis...');
  const testData5 = {
    ...testData2,
    participant_id: "test-participant-5"
  };
  const response5 = await sendRequest(testData5);

  console.log('\nRunning test 3 for analysis...');
  const testData6 = {
    ...testData1,
    participant_id: "test-participant-6"
  };
  const response6 = await sendRequest(testData6);

  // Analyze the results
  console.log('\n\n=== CROSS-DUPLICATE DETECTION ANALYSIS ===');
  const crossDupDetected2 = response2.checks.q2.includes('Cross-duplicate response');
  const sameGroup12 = response1.response_groups.q2 === response2.response_groups.q2;
  const crossDupDetected3 = response3.checks.q2.includes('Cross-duplicate response');
  const sameGroup13 = response1.response_groups.q2 === response3.response_groups.q2;

  console.log(`Cross-duplicate detected for participant 2, question q2: ${crossDupDetected2}`);
  console.log(`Participant 1 and 2 are in the same response group for q2: ${sameGroup12}`);
  console.log(`No cross-duplicate detected for participant 3, question q2: ${!crossDupDetected3}`);
  console.log(`Participant 3 is in a different response group for q2: ${!sameGroup13}`);

  // Final assessment
  if (crossDupDetected2 && sameGroup12 && !crossDupDetected3 && !sameGroup13) {
    console.log('\n✅ CROSS-DUPLICATE CHECKS ARE WORKING CORRECTLY!');
  } else {
    console.log('\n❌ CROSS-DUPLICATE CHECKS MAY NOT BE WORKING CORRECTLY.');
    console.log('Issues detected:');
    if (!crossDupDetected2) console.log('- Similar responses were not flagged as cross-duplicates');
    if (!sameGroup12) console.log('- Similar responses were not placed in the same response group');
    if (crossDupDetected3) console.log('- Different responses were incorrectly flagged as cross-duplicates');
    if (sameGroup13) console.log('- Different responses were incorrectly placed in the same response group');
  }
};

// Run the test
runTest('all').catch(error => {
  console.error('Test failed:', error);
});

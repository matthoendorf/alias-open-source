/**
 * Test script for the Roundtable Alias API
 * 
 * This script demonstrates how to use the Roundtable Alias API by sending a test request
 * to the local development server and displaying the response.
 * 
 * Usage:
 * 1. Make sure you have started the local development server with `npm run dev`
 * 2. Run this script with `node test-api.js`
 */

const http = require('http');

// Test data
const testData = {
  questions: {
    q1: "What is your favorite color?",
    q2: "Describe your ideal vacation."
  },
  survey_id: "test-survey-123",
  participant_id: "test-participant-456",
  responses: {
    q1: "Blue",
    q2: "A relaxing beach vacation with plenty of sunshine and good food. I enjoy swimming in the ocean and exploring local culture."
  },
  low_effort_threshold: 3
};

// Options for the HTTP request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Create the request
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  // A chunk of data has been received
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // The whole response has been received
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('\nAPI Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Display a summary of the results
      console.log('\nSummary:');
      
      // Check for any flags
      let hasFlags = false;
      Object.keys(parsedData.checks).forEach(questionId => {
        if (parsedData.checks[questionId].length > 0) {
          hasFlags = true;
          console.log(`Question ${questionId} has flags: ${parsedData.checks[questionId].join(', ')}`);
        }
      });
      
      if (!hasFlags) {
        console.log('No flags detected in any responses.');
      }
      
      // Display effort ratings
      console.log('\nEffort Ratings:');
      Object.keys(parsedData.effort_ratings).forEach(questionId => {
        const rating = parsedData.effort_ratings[questionId];
        let qualityDescription = '';
        
        if (rating === 0) {
          qualityDescription = 'Empty response';
        } else if (rating <= 3) {
          qualityDescription = 'Low effort';
        } else if (rating <= 7) {
          qualityDescription = 'Normal effort';
        } else {
          qualityDescription = 'High effort (potential GPT-generated content)';
        }
        
        console.log(`Question ${questionId}: ${rating}/10 - ${qualityDescription}`);
      });
      
      // Display response groups
      console.log('\nResponse Groups:');
      Object.keys(parsedData.response_groups).forEach(questionId => {
        console.log(`Question ${questionId}: Group ${parsedData.response_groups[questionId]}`);
      });
      
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.log('Raw response:', data);
    }
  });
});

// Handle request errors
req.on('error', (error) => {
  console.error('Error making request:', error.message);
  console.log('\nMake sure the local development server is running with `npm run dev`');
});

// Write the request body
req.write(JSON.stringify(testData));

// End the request
req.end();

console.log('Sending test request to the Roundtable Alias API...');
console.log('Test data:');
console.log(JSON.stringify(testData, null, 2));

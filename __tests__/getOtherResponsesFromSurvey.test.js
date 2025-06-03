const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: { from: jest.fn(() => ({ send: mockSend })) },
    QueryCommand: actual.QueryCommand,
    UpdateCommand: actual.UpdateCommand
  };
});

jest.mock('@aws-sdk/client-dynamodb', () => {
  return { DynamoDBClient: jest.fn() };
});

const { getOtherResponsesFromSurvey } = require('../helpers/cross-duplicate-utils');

beforeEach(() => {
  mockSend.mockReset();
  process.env.IS_OFFLINE = 'false';
});

test('combines results from multiple pages', async () => {
  mockSend
    .mockResolvedValueOnce({
      Items: [{ participantId: 'p1', responses: { q1: 'Hi' } }],
      LastEvaluatedKey: { id: '1' }
    })
    .mockResolvedValueOnce({
      Items: [{ participantId: 'p2', responses: { q1: 'Bye' } }]
    });

  const result = await getOtherResponsesFromSurvey({}, 'survey1', 'other');

  expect(mockSend).toHaveBeenCalledTimes(2);
  expect(result.q1).toEqual([
    { finalState: 'hi', participantId: 'p1', responseGroup: 0 },
    { finalState: 'bye', participantId: 'p2', responseGroup: 0 }
  ]);
});

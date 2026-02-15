export interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoningContent?: string;
}

export interface StreamData {
  role: 'user' | 'assistant';
  content: string;
  reasoning_content: string;
}

export interface TalkRequest {
  sessionId: string;
  userInput: string;
  model: string;
}

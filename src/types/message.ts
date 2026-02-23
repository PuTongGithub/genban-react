export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  reasoningContent?: string;
}

export interface StreamData {
  role: 'assistant' | 'tool';
  content: string;
  reasoning_content?: string;
}

export interface TalkRequest {
  session_id: string;
  user_input: string;
}

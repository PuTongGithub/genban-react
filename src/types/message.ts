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
  session_id: string;
  user_input: string;
  model: string;
}

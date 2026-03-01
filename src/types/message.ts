export interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  reasoningContent?: string;
  toolCalls?: ToolCall[];
  source?: 'user' | 'assistant' | 'tool' | 'command' | 'error';
}

export interface StreamData {
  type: 'user' | 'assistant' | 'tool' | 'command' | 'error';
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[] | null;
}

export interface SubmitRequest {
  user_input: string;
}

export interface SubmitResponse {
  chat_id: string;
}

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
  source?: 'assistant' | 'tool' | 'command';
}

export interface StreamData {
  source: 'assistant' | 'tool' | 'command';
  id: string;
  role: 'assistant' | 'tool';
  content: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[] | null;
}

export interface TalkRequest {
  user_input: string;
}

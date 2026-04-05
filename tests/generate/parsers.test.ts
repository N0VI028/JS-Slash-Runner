import { describe, expect, it } from 'vitest';
import {
  accumulateToolCallDeltas,
  extractMessageFromData,
  extractReasoningSignatureFromData,
  extractToolCallsFromData,
} from '@/function/generate/parsers';

/**
 * Unit tests for response parsers.
 *
 * Response shapes below are modeled on real payloads from the respective providers
 * (OpenAI chat-completions, Anthropic messages, Google Gemini generateContent, and
 * OpenRouter). They mirror the structures SillyTavern's own tool-calling.js /
 * reasoning.js code handles, so the extractors can be validated without needing a
 * live ST runtime.
 */

describe('extractToolCallsFromData', () => {
  it('returns null for empty / plain-string input', () => {
    expect(extractToolCallsFromData(null)).toBeNull();
    expect(extractToolCallsFromData(undefined)).toBeNull();
    expect(extractToolCallsFromData('')).toBeNull();
    expect(extractToolCallsFromData('plain text reply')).toBeNull();
    expect(extractToolCallsFromData({})).toBeNull();
  });

  it('parses OpenAI chat-completions tool_calls', () => {
    // Real OpenAI format from gpt-4/4o
    const response = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_abc123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Beijing"}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    };

    const result = extractToolCallsFromData(response);
    expect(result).toEqual([
      {
        id: 'call_abc123',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"city":"Beijing"}' },
      },
    ]);
  });

  it('stringifies object arguments in OpenAI format', () => {
    const response = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'do_thing', arguments: { a: 1, b: 'x' } },
              },
            ],
          },
        },
      ],
    };
    const result = extractToolCallsFromData(response);
    expect(result?.[0].function.arguments).toBe('{"a":1,"b":"x"}');
  });

  it('parses Anthropic Claude tool_use blocks', () => {
    // Real Claude messages API response
    const response = {
      id: 'msg_01',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check the weather.' },
        {
          type: 'tool_use',
          id: 'toolu_01A',
          name: 'get_weather',
          input: { location: 'San Francisco' },
        },
      ],
      stop_reason: 'tool_use',
    };

    const result = extractToolCallsFromData(response);
    expect(result).toEqual([
      {
        id: 'toolu_01A',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"San Francisco"}' },
      },
    ]);
  });

  it('parses Google Gemini functionCall parts with thoughtSignature', () => {
    // Real Gemini generateContent response shape, with thought signature attached
    // to the functionCall part (required for multi-turn thinking models).
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'get_weather',
                  args: { city: 'Tokyo', unit: 'celsius' },
                },
                thoughtSignature: 'sig_abc_encrypted_payload',
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
    };

    const result = extractToolCallsFromData(response);
    expect(result).toHaveLength(1);
    expect(result?.[0].function).toEqual({
      name: 'get_weather',
      arguments: '{"city":"Tokyo","unit":"celsius"}',
    });
    expect(result?.[0].thought_signature).toBe('sig_abc_encrypted_payload');
  });

  it('parses parallel Gemini function calls (signature only on the first part)', () => {
    // Per Gemini docs: when the model emits parallel function calls, only the
    // *first* functionCall part carries thoughtSignature; that single signature
    // covers the whole batch and must be replayed when the caller sends results
    // back in the next turn.
    //   https://ai.google.dev/gemini-api/docs/thought-signatures
    const response = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: { name: 'get_current_temperature', args: { location: 'Paris' } },
                thoughtSignature: 'sig_batch_leader',
              },
              {
                functionCall: { name: 'get_current_temperature', args: { location: 'London' } },
                // intentionally no thoughtSignature — parallel calls beyond the first lack one
              },
            ],
          },
        },
      ],
    };

    const result = extractToolCallsFromData(response);
    expect(result).toHaveLength(2);
    expect(result?.[0].function.name).toBe('get_current_temperature');
    expect(result?.[0].thought_signature).toBe('sig_batch_leader');
    expect(result?.[1].function.name).toBe('get_current_temperature');
    expect(result?.[1].thought_signature).toBeUndefined();
  });

  it('parses Google parts via SillyTavern responseContent wrapper', () => {
    // ST backend (src/endpoints/backends/chat-completions.js) re-wraps Gemini
    // responses as { choices: [...], responseContent } so the raw parts are still
    // accessible after OAI-style wrapping.
    const response = {
      choices: [{ message: { content: '' } }],
      responseContent: {
        parts: [
          {
            functionCall: { name: 'lookup', args: {} },
            thoughtSignature: 'sig_from_wrapper',
          },
        ],
        role: 'model',
      },
    };

    const result = extractToolCallsFromData(response);
    expect(result).toHaveLength(1);
    expect(result?.[0].function.name).toBe('lookup');
    expect(result?.[0].thought_signature).toBe('sig_from_wrapper');
  });

  it('attaches OpenRouter reasoning_details encrypted signatures to matching tool_calls', () => {
    // OpenRouter surfaces per-tool encrypted reasoning via reasoning_details[].id
    // that equals the tool_call.id (prefixed with tool_ or call_).
    const response = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'tool_xyz',
                type: 'function',
                function: { name: 'search', arguments: '{"q":"claude"}' },
              },
            ],
            reasoning_details: [
              { type: 'reasoning.encrypted', id: 'tool_xyz', data: 'enc_tool_sig' },
              { type: 'reasoning.encrypted', id: 'msg_global', data: 'enc_msg_sig' },
            ],
          },
        },
      ],
    };

    const result = extractToolCallsFromData(response);
    expect(result?.[0].thought_signature).toBe('enc_tool_sig');
  });

  it('passes through explicit thought_signature field on tool_calls', () => {
    const response = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'f', arguments: '{}' },
                thought_signature: 'already_normalized',
              },
            ],
          },
        },
      ],
    };
    expect(extractToolCallsFromData(response)?.[0].thought_signature).toBe('already_normalized');
  });
});

describe('extractReasoningSignatureFromData', () => {
  it('extracts Gemini top-level text thoughtSignature from candidates', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'Hello world', thoughtSignature: 'sig_text_level' },
            ],
          },
        },
      ],
    };
    expect(extractReasoningSignatureFromData(response)).toBe('sig_text_level');
  });

  it('extracts Gemini thoughtSignature from ST responseContent wrapper', () => {
    const response = {
      choices: [{ message: { content: 'reply' } }],
      responseContent: {
        parts: [{ text: 'reply', thoughtSignature: 'sig_wrapper' }],
      },
    };
    expect(extractReasoningSignatureFromData(response)).toBe('sig_wrapper');
  });

  it('extracts OpenRouter reasoning_details encrypted signature (skipping tool-bound ids)', () => {
    const response = {
      choices: [
        {
          message: {
            content: 'answer',
            reasoning_details: [
              { type: 'reasoning.encrypted', id: 'tool_a', data: 'per_tool' },
              { type: 'reasoning.encrypted', id: 'rsn_main', data: 'global_sig' },
            ],
          },
        },
      ],
    };
    expect(extractReasoningSignatureFromData(response)).toBe('global_sig');
  });

  it('returns null when only tool-bound signatures are present', () => {
    const response = {
      choices: [
        {
          message: {
            reasoning_details: [
              { type: 'reasoning.encrypted', id: 'tool_only', data: 'per_tool' },
              { type: 'reasoning.encrypted', id: 'call_2', data: 'also_tool' },
            ],
          },
        },
      ],
    };
    expect(extractReasoningSignatureFromData(response)).toBeNull();
  });

  it('extracts Claude thinking block signature', () => {
    // Extended thinking responses carry a signature on the thinking block.
    const response = {
      content: [
        { type: 'thinking', thinking: 'chain of thought...', signature: 'claude_think_sig' },
        { type: 'text', text: 'Final answer.' },
      ],
    };
    expect(extractReasoningSignatureFromData(response)).toBe('claude_think_sig');
  });

  it('returns null for responses without any reasoning signature', () => {
    expect(extractReasoningSignatureFromData(null)).toBeNull();
    expect(extractReasoningSignatureFromData('text')).toBeNull();
    expect(
      extractReasoningSignatureFromData({
        choices: [{ message: { content: 'plain' } }],
      }),
    ).toBeNull();
  });
});

describe('accumulateToolCallDeltas', () => {
  it('accumulates OpenAI streaming deltas across chunks', () => {
    // Simulates the 4 chunks OpenAI typically sends for a single tool call.
    const toolCalls: any[] = [];
    const chunks = [
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'get_' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'weather' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"ci' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'ty":"BJ"}' } }] } }] },
    ];
    for (const chunk of chunks) accumulateToolCallDeltas(toolCalls, chunk);

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toMatchObject({
      id: 'call_1',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":"BJ"}' },
    });
  });

  it('captures thoughtSignature that arrives in a later chunk', () => {
    const toolCalls: any[] = [];
    accumulateToolCallDeltas(toolCalls, {
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_2', function: { name: 'f', arguments: '{}' } }] } }] });
    accumulateToolCallDeltas(toolCalls, {
      choices: [{ delta: { tool_calls: [{ index: 0, thoughtSignature: 'late_sig' }] } }] });

    expect(toolCalls[0].thoughtSignature).toBe('late_sig');
  });

  it('ignores chunks that do not carry tool_call deltas', () => {
    const toolCalls: any[] = [];
    accumulateToolCallDeltas(toolCalls, { choices: [{ delta: { content: 'hi' } }] });
    expect(toolCalls).toHaveLength(0);
  });
});

describe('extractMessageFromData', () => {
  it('returns string input unchanged', () => {
    expect(extractMessageFromData('plain')).toBe('plain');
  });

  it('extracts OpenAI choices[0].message.content', () => {
    expect(
      extractMessageFromData({ choices: [{ message: { content: 'hello' } }] }),
    ).toBe('hello');
  });

  it('falls back to data.text then empty string', () => {
    expect(extractMessageFromData({ text: 'fallback' })).toBe('fallback');
    expect(extractMessageFromData({})).toBe('');
  });
});

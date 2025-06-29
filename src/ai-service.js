const axios = require('axios');

class AIService {
  constructor() {
    // You can add your API keys here or use environment variables
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.preferredProvider = 'claude'; // or 'openai'
  }

  async processText(text, instruction) {
    try {
      if (this.preferredProvider === 'claude' && this.claudeApiKey) {
        return await this.processWithClaude(text, instruction);
      } else if (this.openaiApiKey) {
        return await this.processWithOpenAI(text, instruction);
      } else {
        return this.processWithMockAI(text, instruction);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      return `エラーが発生しました: ${error.message}`;
    }
  }

  async processWithClaude(text, instruction) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `以下のテキストに対して「${instruction}」を実行してください。\n\nテキスト:\n${text}`
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${this.claudeApiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey
      }
    });

    return response.data.content[0].text;
  }

  async processWithOpenAI(text, instruction) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `以下のテキストに対して「${instruction}」を実行してください。\n\nテキスト:\n${text}`
      }],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }

  processWithMockAI(text, instruction) {
    // Mock AI processing for demo purposes
    const mockResponses = {
      '要約': this.summarizeText(text),
      '翻訳': this.translateText(text),
      '箇条書き': this.bulletPointText(text),
      '整理': this.organizeText(text)
    };

    // Find matching instruction
    for (const [key, value] of Object.entries(mockResponses)) {
      if (instruction.includes(key)) {
        return value;
      }
    }

    return `「${instruction}」を適用:\n\n${text}\n\n[注意: 実際のAI処理を行うには、Claude APIキーまたはOpenAI APIキーを設定してください]`;
  }

  summarizeText(text) {
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const summary = sentences.slice(0, Math.max(1, Math.floor(sentences.length / 2))).join('。');
    return `要約:\n${summary}`;
  }

  translateText(text) {
    // Simple mock translation
    return `翻訳結果:\n[English] ${text}\n\n[注意: 実際の翻訳を行うには、AI APIキーを設定してください]`;
  }

  bulletPointText(text) {
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const bullets = sentences.map(s => `• ${s.trim()}`).join('\n');
    return `箇条書き:\n${bullets}`;
  }

  organizeText(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const organized = lines.map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
    return `整理済み:\n${organized}`;
  }
}

module.exports = AIService;
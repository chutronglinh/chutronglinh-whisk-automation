import axios from 'axios';

const API_ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
const ORIGIN = 'https://labs.google';
const REFERER = 'https://labs.google/';

export class ImageGenerator {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  generateSessionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `j${timestamp}${random}`;
  }

  async generateImage(workflowId, prompt, config) {
    const payload = {
      clientContext: {
        workflowId,
        tool: 'BACKBONE',
        sessionId: this.generateSessionId()
      },
      imageModelSettings: {
        imageModel: config.imageModel,
        aspectRatio: config.aspectRatio
      },
      mediaCategory: config.mediaCategory,
      prompt
    };

    if (config.seed) {
      payload.seed = config.seed;
    }

    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': ORIGIN,
        'Referer': REFERER
      }
    });

    return response.data;
  }
}
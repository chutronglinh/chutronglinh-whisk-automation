import axios from 'axios';

const SESSION_API = 'https://labs.google/fx/api/auth/session';
const CREATE_PROJECT_API = 'https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow';
const GENERATE_IMAGE_API = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
const COOKIE_NAME = '__Secure-next-auth.session-token';

class WhiskApiService {
  /**
   * Generate session ID for API calls
   */
  static generateSessionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `j${timestamp}${random}`;
  }

  /**
   * Get access token from session cookie
   * @param {string} sessionCookie 
   * @returns {Promise<{valid: boolean, accessToken?: string, error?: string}>}
   */
  static async getAccessToken(sessionCookie) {
    try {
      const response = await axios.get(SESSION_API, {
        headers: {
          'Cookie': `${COOKIE_NAME}=${sessionCookie}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://labs.google/fx/tools/whisk',
          'Origin': 'https://labs.google'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.data?.code === 200 && 
          response.data?.messages === 'ACCESS_TOKEN_REFRESH_NEEDED') {
        return {
          valid: false,
          needRefresh: true,
          error: 'ACCESS_TOKEN_REFRESH_NEEDED'
        };
      }

      const accessToken = response.data?.access_token;
      const user = response.data?.user;

      if (accessToken && user) {
        return {
          valid: true,
          accessToken: accessToken,
          userInfo: {
            name: user.name,
            email: user.email,
            expires: response.data?.expires
          }
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: `Authentication failed (${response.status})`
        };
      }

      return {
        valid: false,
        error: `Unknown response structure. Status: ${response.status}`
      };

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        return {
          valid: false,
          error: 'Request timeout'
        };
      }

      return {
        valid: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Create a new project (workflow)
   * @param {string} sessionCookie 
   * @param {string} projectName 
   * @returns {Promise<string>} workflowId
   */
  static async createProject(sessionCookie, projectName) {
    try {
      const response = await axios.post(
        CREATE_PROJECT_API,
        {
          json: {
            clientContext: {
              tool: 'BACKBONE',
              sessionId: this.generateSessionId()
            },
            mediaGenerationIdsTopCopy: [],
            workflowMetadata: {
              workflowName: projectName
            }
          }
        },
        {
          headers: {
            'Cookie': `${COOKIE_NAME}=${sessionCookie}`,
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/fx/tools/whisk',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000
        }
      );

      const workflowId = response.data?.result?.data?.json?.result?.workflowId;
      
      if (!workflowId) {
        throw new Error('Invalid response: workflowId not found');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      if (!uuidRegex.test(workflowId)) {
        throw new Error(`Invalid workflowId format: ${workflowId}`);
      }

      return workflowId;

    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Generate image using Whisk API
   * @param {string} accessToken 
   * @param {string} workflowId 
   * @param {string} prompt 
   * @param {Object} options 
   * @returns {Promise<Object>} Response with image data
   */
  static async generateImage(accessToken, workflowId, prompt, options = {}) {
    const {
      imageModel = 'IMAGEN_3_5',
      aspectRatio = 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      mediaCategory = 'MEDIA_CATEGORY_BOARD',
      seed = null
    } = options;

    try {
      const payload = {
        clientContext: {
          workflowId: workflowId,
          tool: 'BACKBONE',
          sessionId: this.generateSessionId()
        },
        imageModelSettings: {
          imageModel: imageModel,
          aspectRatio: aspectRatio
        },
        mediaCategory: mediaCategory,
        prompt: prompt
      };

      if (seed !== null) {
        payload.seed = seed;
      }

      const response = await axios.post(
        GENERATE_IMAGE_API,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain;charset=UTF-8',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/'
          },
          timeout: 120000 // 2 minutes for image generation
        }
      );

      return response.data;

    } catch (error) {
      if (error.response) {
        throw new Error(`API error ${error.response.status}: ${error.response.data?.error?.message || 'Unknown error'}`);
      }
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Extract images from API response
   * @param {Object} response 
   * @returns {Array<string>} Base64 encoded images
   */
  static extractImages(response) {
    try {
      if (!response.imagePanels || response.imagePanels.length === 0) {
        throw new Error('No image panels in response');
      }

      const images = response.imagePanels[0].generatedImages;

      if (!images || images.length === 0) {
        throw new Error('No images generated');
      }

      return images.map(img => img.encodedImage);

    } catch (error) {
      throw new Error(`Failed to extract images: ${error.message}`);
    }
  }
}

export default WhiskApiService;
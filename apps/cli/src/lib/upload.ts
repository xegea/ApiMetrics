import axios, { AxiosRequestConfig } from 'axios';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { TestResult } from '@apimetrics/shared';

const gzipAsync = promisify(gzip);

/**
 * Compress test results and upload to API endpoint
 */
export async function compressAndUpload(
  result: TestResult,
  apiUrl: string,
  token?: string
): Promise<void> {
  try {
    // Convert result to JSON and compress
    const jsonString = JSON.stringify(result);
    const compressed = await gzipAsync(Buffer.from(jsonString, 'utf-8'));

    // Prepare request configuration
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${apiUrl}/results`,
      data: compressed,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    // Upload
    const response = await axios(config);

    if (response.status >= 200 && response.status < 300) {
      return;
    } else {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      throw new Error(`API upload failed${status ? ` (${status})` : ''}: ${message}`);
    }
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}


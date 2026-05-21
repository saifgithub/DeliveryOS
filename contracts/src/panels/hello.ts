import type { RequestType } from 'vscode-messenger-common';

export interface GetHelloTextParams {
  projectName?: string;
}

export interface GetHelloTextResult {
  text: string;
  timestamp: number;
}

export const GetHelloText: RequestType<GetHelloTextParams, GetHelloTextResult> =
  {
    method: 'hello/getHelloText',
  };

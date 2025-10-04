export interface MessageAdapter {
  send(message: string): Promise<any>;
}

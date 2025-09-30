export class AppError extends Error {
  response: Response;
  data: object;

  constructor(message: string, response?: Response, data?: object) {
    super(message);
    if (response) this.response = response;
    if (data) this.data = data;
  }
}

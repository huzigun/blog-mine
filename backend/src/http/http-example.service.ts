import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class HttpExampleService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Example: Fetch data from external API
   * HttpModule이 글로벌로 등록되어 있어서 별도의 import 없이 사용 가능
   */
  async fetchExternalData<T = any>(url: string): Promise<T> {
    const observable: Observable<AxiosResponse<T>> =
      this.httpService.get<T>(url);
    const response = await firstValueFrom(observable);
    return response.data;
  }

  /**
   * Example: POST request
   */
  async postData<T = any, D = any>(url: string, data: D): Promise<T> {
    const observable: Observable<AxiosResponse<T>> = this.httpService.post<T>(
      url,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const response = await firstValueFrom(observable);
    return response.data;
  }

  /**
   * Example: GET request with RxJS operators
   * RxJS 오퍼레이터를 사용한 방법
   */
  async fetchWithOperators<T = any>(url: string): Promise<T> {
    const observable = this.httpService.get<T>(url).pipe(
      map((response: AxiosResponse<T>) => response.data),
      catchError((error) => {
        throw new Error(`HTTP request failed: ${error.message}`);
      }),
    );
    return firstValueFrom(observable);
  }

  /**
   * Example: Direct Observable usage (no async/await)
   * Observable을 직접 반환하는 방법
   */
  fetchAsObservable<T = any>(url: string): Observable<T> {
    return this.httpService
      .get<T>(url)
      .pipe(map((response: AxiosResponse<T>) => response.data));
  }
}

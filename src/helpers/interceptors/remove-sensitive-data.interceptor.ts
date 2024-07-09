import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RemoveSensitiveDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.removeSensitiveData(data)));
  }

  private removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeSensitiveData(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj = { ...obj };
      delete newObj.password; // Remove the password field
      for (const key in newObj) {
        newObj[key] = this.removeSensitiveData(newObj[key]);
      }
      return newObj;
    }
    return obj;
  }
}

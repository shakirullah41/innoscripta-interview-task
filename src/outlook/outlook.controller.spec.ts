import { Test, TestingModule } from '@nestjs/testing';
import { OutlookController } from './outlook.controller';

describe('OutlookController', () => {
  let controller: OutlookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutlookController],
    }).compile();

    controller = module.get<OutlookController>(OutlookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

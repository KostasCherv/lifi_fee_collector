import { prop, getModelForClass, modelOptions, Severity } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

@modelOptions({
  schemaOptions: {
    collection: 'scraper_states',
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class ScraperState extends TimeStamps {
  @prop({ required: true, unique: true, index: true })
  public chainId!: number;

  @prop({ required: true, default: 0 })
  public lastProcessedBlock!: number;

  @prop({ required: true, default: false })
  public isActive!: boolean;

  @prop({ required: true, default: Date.now })
  public lastRunAt!: Date;

  @prop({ required: true, default: 0 })
  public errorCount!: number;

  @prop({ required: false })
  public lastError?: string;

  @prop({ required: true, enum: ['running', 'stopped', 'error', 'starting'], default: 'stopped' })
  public workerStatus!: 'running' | 'stopped' | 'error' | 'starting';

  @prop({ required: false })
  public lastWorkerStart?: Date;

  @prop({ required: false })
  public lastWorkerError?: string;
}

export const ScraperStateModel = getModelForClass(ScraperState); 
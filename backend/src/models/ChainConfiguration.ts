import { prop, getModelForClass, modelOptions, Severity } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

@modelOptions({
  schemaOptions: {
    collection: 'chain_configurations',
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class ChainConfiguration extends TimeStamps {
  @prop({ required: true, unique: true, index: true })
  public chainId!: number;

  @prop({ required: true, maxlength: 50 })
  public name!: string;

  @prop({ required: true })
  public rpcUrl!: string;

  @prop({ required: true })
  public contractAddress!: string;

  @prop({ required: true, default: 70000000 })
  public startingBlock!: number;

  @prop({ required: true, default: true })
  public isEnabled!: boolean;

  @prop({ required: true, default: 30000, min: 5000, max: 300000 })
  public scanInterval!: number; // milliseconds

  @prop({ required: true, default: 1000, min: 100, max: 10000 })
  public maxBlockRange!: number; // max blocks to scan per iteration

  @prop({ required: true, default: 3, min: 1, max: 10 })
  public retryAttempts!: number;

  @prop({ required: true, enum: ['running', 'stopped', 'error', 'starting'], default: 'stopped' })
  public workerStatus!: 'running' | 'stopped' | 'error' | 'starting';

  @prop({ required: false })
  public lastWorkerStart?: Date;

  @prop({ required: false })
  public lastWorkerError?: string;
}

export const ChainConfigurationModel = getModelForClass(ChainConfiguration); 
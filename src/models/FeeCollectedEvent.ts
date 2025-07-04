import { prop, getModelForClass, modelOptions, Severity } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

@modelOptions({
  schemaOptions: {
    collection: 'fee_collected_events',
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class FeeCollectedEvent extends TimeStamps {
  @prop({ required: true, index: true })
  public chainId!: number;

  @prop({ required: true, index: true })
  public blockNumber!: number;

  @prop({ required: true })
  public blockHash!: string;

  @prop({ required: true, index: true })
  public transactionHash!: string;

  @prop({ required: true })
  public logIndex!: number;

  @prop({ required: true, index: true })
  public token!: string;

  @prop({ required: true, index: true })
  public integrator!: string;

  @prop({ required: true })
  public integratorFee!: string; // BigNumber as string

  @prop({ required: true })
  public lifiFee!: string; // BigNumber as string

  @prop({ required: true, index: true })
  public timestamp!: Date;
}

export const FeeCollectedEventModel = getModelForClass(FeeCollectedEvent); 
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

export class ShipmentEvent {
    public eventId!: string;
    public shipmentId!: string;
    public eventType!: string;
    public location!: string;
    public timestamp!: string;
    public recordedBy!: string;
}

@Info({ title: 'ShipmentTraceability', description: 'Smart contract for tracing shipment events' })
export class ShipmentContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        console.log('Ledger initialized');
    }

    @Transaction()
    @Returns('string')
    public async RecordShipmentEvent(
        ctx: Context,
        shipmentId: string,
        eventId: string,
        eventType: string,
        location: string,
        timestamp: string,
        recordedBy: string
    ): Promise<string> {
        const event: ShipmentEvent = {
            eventId,
            shipmentId,
            eventType,
            location,
            timestamp,
            recordedBy
        };

        // Construct key using shipmentId and eventId to allow multiple events per shipment
        const eventKey = ctx.stub.createCompositeKey('ShipmentEvent', [shipmentId, eventId]);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));
        
        return JSON.stringify(event);
    }

    @Transaction(false)
    @Returns('string')
    public async GetShipmentHistory(ctx: Context, shipmentId: string): Promise<string> {
        const iterator = await ctx.stub.getStateByPartialCompositeKey('ShipmentEvent', [shipmentId]);
        const allResults = [];
        
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value) {
                let parsedItem;
                try {
                    parsedItem = JSON.parse(res.value.value.toString());
                } catch (err) {
                    parsedItem = res.value.value.toString();
                }
                allResults.push(parsedItem);
            }
            if (res.done) {
                await iterator.close();
                return JSON.stringify(allResults);
            }
        }
    }
}

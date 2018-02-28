import {SupertypeSession, SupertypeLogger} from 'supertype';
import {Persistor} from 'persistor';
type Constructable<BC> = new (...args: any[]) => BC;

export class AmorphicSession extends SupertypeSession {
    connectSession : any;
    withoutChangeTracking (callback : Function) {};
    config : any;
    __transient__ : any;
    __changeTracking__: any;
    reqSession: any;
    expireSession(): any {};
}
export function Remoteable<BC extends Constructable<{}>>(Base: BC) {
    return class extends Base {
        amorphicate (obj : any) {}
        amorphic : AmorphicSession
    };
}
export type amorphicStaticType = {
    logger : SupertypeLogger;
    config : any;
    beginDefaultTransaction() : any;
    beginTransaction(nodefault? : boolean) : any;
    endTransaction(persistorTransaction?, logger?) : any;
    begin (isdefault?) : any;
    end (persistorTransaction?, logger?) : any;
    commit (options?) : any;
    createTransientObject(callback : any) : any;
    __transient__ : any;
    __dictionary__: any;
    debugInfo: any;
    reqSession: any;
    getClasses(): any;
    syncAllTables(): any;
    getInstance(): any;
}
export class amorphicStatic {
    static logger : SupertypeLogger;
    static config : any;
    static beginDefaultTransaction() : any {}
    static beginTransaction(nodefault? : boolean) : any {}
    static endTransaction(persistorTransaction?, logger?) : any {}
    static begin (isdefault?) : any {}
    static end (persistorTransaction?, logger?) : any {};
    static commit (options?) : any {};
    static createTransientObject(callback : any) : any {};
    static __transient__ : any;
    static __dictionary__: any;
    static debugInfo: any;
    static reqSession: any;
    static getClasses(): any {};
    static syncAllTables(): any {};
    static getInstance(): any {};
}
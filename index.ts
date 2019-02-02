
import "reflect-metadata";

export function injectable(target: Ctor<any>) {
    throwIf(target.length > 0 && !Reflect.hasOwnMetadata(paramTypesMetaKey, target), `please enable "emitDecoratorMetadata" compiler option`);
    Reflect.defineMetadata(dependenciesMetaKey, Reflect.getOwnMetadata(paramTypesMetaKey, target) || [], target);
}

export class DIScope {
    private _instanceMap: InstanceMap = new InstanceMap();
    private _mockMap = new Map<Ctor<any>, Ctor<any>>();

    public get<T>(ctor: Ctor<T>): T {
        return this._construct(ctor, DependencyChain.root);
    }

    public use<T>(ctor: Ctor<T>, instance: T): this {
        this._instanceMap.set(ctor, instance);
        return this;
    }

    public mock<T>(ctor: Ctor<T>, implementor: Ctor<T>): this {
        this._mockMap.set(ctor, implementor);
        return this;
    }

    private _construct<T>(ctor: Ctor<T>, depChain: DependencyChain, constructing?: Set<Ctor<any>>): T {
        let originCtor: Ctor<T> | undefined;
        if (this._mockMap.has(ctor)) {
            originCtor = ctor;
            ctor = this._mockMap.get(ctor)!;
        }

        if (this._instanceMap.has(ctor)) {
            return this._instanceMap.get(ctor);
        } else {
            constructing = constructing || new Set();
            throwIf(constructing.has(ctor), `dependency loop: ${depChain.printLoop(ctor, originCtor)}`)
            constructing.add(ctor);

            const dependencies: Ctor<any>[] = Reflect.getOwnMetadata(dependenciesMetaKey, ctor);
            throwIf(!Array.isArray(dependencies), `${stringifyCtorAndOrigin(ctor, originCtor)} is not injectable, dependency chain: ${depChain.print()}`);

            const newDepChain = depChain.next(ctor, originCtor);
            const depInstances = dependencies.map(d => this._construct(d, newDepChain, constructing));
            // create instance after dependencies are ready
            const instance = new ctor(...depInstances);
            // singleton
            this._instanceMap.set(ctor, instance);

            // mark construction finish
            constructing.delete(ctor);

            return instance;
        }
    }
}

const paramTypesMetaKey = "design:paramtypes";
const dependenciesMetaKey = "__dependencies__";

type Ctor<T> = new (...param: any[]) => T;

class DependencyChain {
    public static readonly printDelimiter = "---";
    public static readonly root = new DependencyChain();

    public next(ctor: Ctor<any>, originCtor?: Ctor<any>): DependencyChain {
        return new DependencyChain(this, ctor, originCtor);
    }

    public print(): string {
        const ctors: string[] = [];
        let cursor: DependencyChain = this;

        while (cursor !== DependencyChain.root) {
            ctors.push(cursor.nodeToString());
            cursor = cursor._parent!;
        }

        return ctors.reverse().join(DependencyChain.printDelimiter);
    }

    public printLoop(ctor: Ctor<any>, originCtor?: Ctor<any>): string {
        const ctors: string[] = [];
        let cursor: DependencyChain = this;

        while (cursor !== DependencyChain.root) {
            ctors.push(cursor.nodeToString());

            if (cursor._ctor === ctor) {
                break;
            } else {
                cursor = cursor._parent!;
            }
        }

        if (cursor === DependencyChain.root) {
            return "";
        } else {
            return ctors.reverse().join(DependencyChain.printDelimiter);
        }
    }

    public nodeToString(): string {
        if (this === DependencyChain.root) {
            return "__root__";
        } else {
            return stringifyCtorAndOrigin(this._ctor!, this._orignCtor);
        }
    }

    private _parent?: DependencyChain;
    private _ctor?: Ctor<any>;
    private _orignCtor?: Ctor<any>;

    private constructor(parent?: DependencyChain, ctor?: Ctor<any>, orignCtor?: Ctor<any>) {
        this._parent = parent;
        this._ctor = ctor;
        this._orignCtor = orignCtor;
    }
}

class InstanceMap extends Map<Ctor<any>, any>{
    public set<T>(ctor: Ctor<T>, instance: T): this {
        return super.set(ctor, instance);
    }

    public get<T>(ctor: Ctor<T>): T {
        return super.get(ctor);
    }
}

function throwIf(cond: boolean, msg: string) {
    if (cond) {
        throw new Error(msg);
    }
}

function stringifyCtorAndOrigin(ctor: Ctor<any>, originCtor?: Ctor<any>) {
    return ctor.name + (originCtor ? `(${originCtor.name})` : "");
}

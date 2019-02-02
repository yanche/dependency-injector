
import "reflect-metadata";

export function injectable(target: Ctor<any>) {
    throwIf(target.length > 0 && !Reflect.hasOwnMetadata(paramTypesMetaKey, target), `please enable "emitDecoratorMetadata" compiler option`);
    Reflect.defineMetadata(dependenciesMetaKey, Reflect.getOwnMetadata(paramTypesMetaKey, target) || [], target);
}

export class DIScope {
    private _instanceMap: InstanceMap = new InstanceMap();

    public get<T>(ctor: Ctor<T>): T {
        return this._construct(ctor, DependencyChain.root);
    }

    private _construct<T>(ctor: Ctor<T>, depChain: DependencyChain, constructing?: Set<Ctor<any>>): T {
        if (this._instanceMap.has(ctor)) {
            return this._instanceMap.get(ctor);
        } else {
            constructing = constructing || new Set();
            throwIf(constructing.has(ctor), `dependency loop: ${depChain.printLoop(ctor)}`)
            constructing.add(ctor);

            const dependencies: Ctor<any>[] = Reflect.getOwnMetadata(dependenciesMetaKey, ctor);
            throwIf(!Array.isArray(dependencies), `${ctor.name} is not injectable, dependency chain: ${depChain.print()}`);

            const newDepChain = depChain.next(ctor);
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

    public next(ctor: Ctor<any>): DependencyChain {
        return new DependencyChain(this, ctor);
    }

    public print(): string {
        const ctors: Ctor<any>[] = [];
        let cursor: DependencyChain = this;

        while (cursor !== DependencyChain.root) {
            ctors.push(cursor._ctor!);
            cursor = cursor._parent!;
        }

        return ctors.reverse().map(ctor => ctor.name).join(DependencyChain.printDelimiter);
    }

    public printLoop(ctor: Ctor<any>): string {
        const ctors: Ctor<any>[] = [ctor];
        let cursor: DependencyChain = this;

        while (cursor !== DependencyChain.root) {
            ctors.push(cursor._ctor!);

            if (cursor._ctor === ctor) {
                break;
            } else {
                cursor = cursor._parent!;
            }
        }

        if (cursor === DependencyChain.root) {
            return "";
        } else {
            return ctors.reverse().map(ctor => ctor.name).join(DependencyChain.printDelimiter);
        }
    }

    private _parent?: DependencyChain;
    private _ctor?: Ctor<any>;

    private constructor(parent?: DependencyChain, ctor?: Ctor<any>) {
        this._parent = parent;
        this._ctor = ctor;
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

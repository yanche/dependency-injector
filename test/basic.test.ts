
import { injectable, DIScope } from "../index";
import * as assert from "assert";

@injectable
class C4 { }

@injectable
class C2 {
    constructor(public readonly c4: C4) { }
}

@injectable
class C3 {
    constructor(public readonly c4: C4) { }
}

@injectable
class C1 {
    constructor(public readonly c2: C2, public readonly c3: C3) { }
}

describe("basic DI test", () => {
    it("able to instantiate", () => {
        const scope = new DIScope();
        assert.ok(scope.get(C1) instanceof C1);
    });

    it("singleton", () => {
        const scope = new DIScope();
        assert.strictEqual(scope.get(C1), scope.get(C1));
    });

    it("singleton 2", () => {
        const scope = new DIScope();
        const c1 = scope.get(C1);
        assert.strictEqual(c1.c2.c4, c1.c3.c4);
    });

    it("instantiate on demand", () => {
        let c1Init = 0;
        let c2Init = 0;

        @injectable
        class C1 {
            constructor() {
                c1Init++;
            }
        }

        @injectable
        class C2 {
            constructor(public readonly c1: C1) {
                c2Init++;
            }
        }

        const scope = new DIScope();
        assert.strictEqual(c1Init, 0);
        assert.strictEqual(c2Init, 0);
        scope.get(C1);
        assert.strictEqual(c1Init, 1);
        assert.strictEqual(c2Init, 0);
        scope.get(C1);
        assert.strictEqual(c1Init, 1);
        assert.strictEqual(c2Init, 0);
        scope.get(C2);
        assert.strictEqual(c1Init, 1);
        assert.strictEqual(c2Init, 1);
    });

    it("fail on non-injectable dependency", () => {
        class C0 { }

        @injectable
        class C1 {
            constructor(c0: C0) { }
        }

        @injectable
        class C2 {
            constructor(c1: C1) { }
        }

        @injectable
        class C3 {
            constructor(c2: C2) { }
        }

        const scope = new DIScope();
        try {
            scope.get(C3);
            assert.fail("should throw");
        } catch (err) {
            const msg: string = err.message;
            assert.ok(msg.includes("C0 is not injectable"));
            assert.ok(msg.includes("C3---C2---C1"));
        }
    });
});

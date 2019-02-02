
import { injectable, DIScope } from "../index";
import * as assert from "assert";

describe("mock api test", () => {
    it("inject composer", () => {
        let c2Init = 0;

        @injectable
        class C2 {
            constructor() {
                c2Init++;
            }

            public method1() { }
        }

        @injectable
        class C1 {
            constructor(public readonly c2: C2) { }
        }

        @injectable
        class C3 {
            public method1() { }
        }

        const scope = new DIScope();
        scope.mock(C2, C3);
        const c1 = scope.get(C1);
        assert.ok(c1.c2 instanceof C3);
        assert.strictEqual(c2Init, 0);
    });

    it("composer dependency", () => {
        let c4Init = 0;

        @injectable
        class C2 {
            public method1() { }
        }

        @injectable
        class C1 {
            constructor(public readonly c2: C2) { }
        }

        @injectable
        class C4 {
            constructor() {
                c4Init++;
            }
        }

        @injectable
        class C3 {
            constructor(public readonly c4: C4) { }

            public method1() { }
        }

        const scope = new DIScope();
        scope.mock(C2, C3);
        const c1 = scope.get(C1);
        assert.ok(c1.c2 instanceof C3);
        assert.ok((<any>c1.c2).c4 instanceof C4);
        assert.strictEqual(c4Init, 1);
    });
});

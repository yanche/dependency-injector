
import { injectable, DIScope } from "../index";
import * as assert from "assert";

describe("use api test", () => {
    it("inject instance", () => {
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

        class C3 {
            public method1() { }
        }

        const scope = new DIScope();
        const c3 = new C3();
        scope.use(C2, c3);
        const c1 = scope.get(C1);
        assert.strictEqual(c1.c2, c3);
        assert.strictEqual(c2Init, 0);
    });
});

import { World, setWorldConstructor } from "@cucumber/cucumber"
import { createTestFDC3ServerInstance } from "../support/TestFDC3ServerInstance"
import { BasicDirectory } from "../../src/directory/BasicDirectory"

export class CustomWorld extends World {
  sc = createTestFDC3ServerInstance(this, [], new BasicDirectory([]), false)
  props: Record<string, any> = {}
}

setWorldConstructor(CustomWorld)

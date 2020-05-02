import { prepareRun, runFunction } from './run'
import { join } from 'path'
import { promises as fs } from 'fs'
import { on } from '../../AppCycle/EventSystem'
import { IDisposable } from '../../Types/disposable'

declare const __static: string

export type TFileRunner = (
	fileName: string,
	...args: unknown[]
) => Promise<unknown>
export function createFileRunner(
	directory: string,
	ENV: (...args: unknown[]) => unknown
): TFileRunner {
	//May not be changed to keep reference inside of ENV working
	const disposables: IDisposable[] = []
	let hadProjectSelectTrigger = false
	let CACHE: {
		[fileName: string]: (Bridge: unknown) => void
	} = {}

	const reset = () => {
		// bridge:changedProject triggers upon loading the initial project...
		// ...but we don't want to reset the FileRunner this case
		if (!hadProjectSelectTrigger) return (hadProjectSelectTrigger = true)

		disposables.forEach(dis => dis.dispose())
		disposables.splice(0, disposables.length)
		CACHE = {}
	}

	on('bridge:changedProject', reset)
	on('bridge:scriptRunner.resetCaches', reset)

	return async function runFile(fileName: string, ...args: unknown[]) {
		if (CACHE[fileName] !== undefined)
			return runFunction(CACHE[fileName], ENV(disposables, ...args))

		let func = prepareRun(
			(await fs.readFile(join(__static, directory, fileName))).toString(
				'utf-8'
			)
		)
		CACHE[fileName] = func
		return runFunction(func, ENV(disposables, ...args))
	}
}

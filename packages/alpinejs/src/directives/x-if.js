import { evaluateLater } from '../evaluator'
import { addScopeToNode } from '../scope'
import { directive } from '../directives'
import { initTree } from '../lifecycle'
import { mutateDom } from '../mutation'
import { walk } from "../utils/walk"
import { dequeueJob } from '../scheduler'

directive('if', (el, { expression }, { effect, cleanup }) => {
    let evaluate = evaluateLater(el, expression)

    let show = () => {
        if (el._x_currentIfEl) return el._x_currentIfEl

        // Check if template.content has an element
        // If this is inside a Vue application, the <template> tag will already have been evaluated
        let clone = el.content.firstElementChild ? el.content.cloneNode(true).firstElementChild : el.firstElementChild.cloneNode(true)

        addScopeToNode(clone, {}, el)

        mutateDom(() => {
            el.after(clone)

            initTree(clone)
        })

        el._x_currentIfEl = clone

        el._x_undoIf = () => {
            walk(clone, (node) => {
                if (!!node._x_effects) {
                    node._x_effects.forEach(dequeueJob)
                }
            })
            
            clone.remove();

            delete el._x_currentIfEl
        }

        return clone
    }

    let hide = () => {
        if (! el._x_undoIf) return

        el._x_undoIf()

        delete el._x_undoIf
    }

    effect(() => evaluate(value => {
        value ? show() : hide()
    }))

    cleanup(() => el._x_undoIf && el._x_undoIf())
})

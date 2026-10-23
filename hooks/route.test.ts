import { test, expect } from 'claude-code/testing'
import { route } from './register'

test('quick questions go to Haiku', () => {
  expect(route('what time is it in miami?', 10).tier).toBe('haiku')
  expect(route('thanks', null).tier).toBe('haiku')
})
test('edits go to Sonnet', () => {
  expect(route('fix the caption on the 3pm post and add two hashtags', 10).tier).toBe('sonnet')
})
test('big builds go to Opus, unless the week is nearly used up', () => {
  const ask = 'Build me a Claude mod that decides which model to use before sending the prompt, with a usage display above the message box'
  expect(route(ask, 10).tier).toBe('opus')
  expect(route(ask, 90).tier).toBe('sonnet')
  expect(route(ask, 97).tier).toBe('haiku')
})

test('effort follows the ask', () => {
  expect(route('thanks', 10).effort).toBe('low')
  expect(route('fix the caption on the 3pm post and add two hashtags', 10).effort).toBe('medium')
  expect(route('Build me a Claude mod that decides which model to use before sending the prompt, with a usage display above the message box', 10).effort).toBe('high')
  expect(route('debug why the studio analytics show stale follower counts and fix the whole pipeline end to end', 10).effort).toBe('xhigh')
})
test('effort steps down with the weekly limit', () => {
  const ask = 'Build me a Claude mod that decides which model to use before sending the prompt, with a usage display above the message box'
  expect(route(ask, 90).effort).toBe('medium')
  expect(route(ask, 97).effort).toBe('low')
})

import { routeWithContext } from './register'
const offer = 'The plan:\n1. Clone it to the server and run it 24/7.\n2. Reskin the space station into a city.\n3. Wire in our engines.\nWant me to start with step 1? That is cloning it, running it, and building the city.'
test('a "yes" to a build plan routes on the plan', () => {
  expect(routeWithContext('yes', offer, 30).tier).toBe('opus')
  expect(routeWithContext('go ahead', offer, 30).tier).toBe('opus')
})
test('small talk and real questions stay cheap', () => {
  expect(routeWithContext('thanks', offer, 30).tier).toBe('haiku')
  expect(routeWithContext('yes', 'Want me to show the trimmed samples?', 30).tier).toBe('haiku')
  expect(routeWithContext('how long will it take?', offer, 30).tier).toBe('haiku')
})
test('a short follow-up inside a build is at least Sonnet', () => {
  expect(routeWithContext('use the pink one', offer, 30).tier).toBe('sonnet')
})

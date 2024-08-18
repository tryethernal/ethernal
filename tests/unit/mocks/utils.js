jest.mock('@/lib/utils', () => {
    const actual = jest.requireActual('@/lib/utils');
    return {
        ...actual,
        debounce: fn => fn
    }
});

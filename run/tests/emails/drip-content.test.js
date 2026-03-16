const { getEmailContent } = require('../../emails/drip-content');

describe('drip-content', () => {
    const baseData = {
        explorerSlug: 'my-chain',
        explorerLink: 'https://my-chain.app.tryethernal.com',
        email: 'dev@example.com',
        unsubscribeUrl: 'https://app.tryethernal.com/api/demo/unsubscribe?token=abc'
    };

    it('Should return content for step 1', () => {
        const content = getEmailContent(1, baseData);
        expect(content.subject).toEqual('Your Ethernal demo explorer is ready');
        expect(content.textPart).toContain('my-chain');
        expect(content.htmlPart).toBeNull(); // Step 1 is plain text only
    });

    it('Should return content for step 2', () => {
        const content = getEmailContent(2, { ...baseData, activitySummary: '12 token transfers synced' });
        expect(content.subject).toContain('synced');
        expect(content.htmlPart).toContain('12 token transfers synced');
    });

    it('Should return content for step 3', () => {
        const content = getEmailContent(3, baseData);
        expect(content.subject).toContain('missing');
        expect(content.htmlPart).toContain('Demo');
        expect(content.htmlPart).toContain('Paid');
    });

    it('Should return content for step 4 with custom team context', () => {
        const content = getEmailContent(4, { ...baseData, teamContext: 'Acme builds on Base L2' });
        expect(content.subject).toContain('Teams');
        expect(content.htmlPart).toContain('Acme builds on Base L2');
    });

    it('Should return content for step 4 with default fallback', () => {
        const content = getEmailContent(4, baseData);
        expect(content.htmlPart).toContain('EVM');
    });

    it('Should return content for step 5', () => {
        const content = getEmailContent(5, baseData);
        expect(content.subject).toContain('expires');
        expect(content.htmlPart).toContain('2 days');
    });

    it('Should return content for step 6', () => {
        const content = getEmailContent(6, baseData);
        expect(content.subject).toContain('expired');
        expect(content.htmlPart).toContain('48');
    });

    it('Should throw for invalid step', () => {
        expect(() => getEmailContent(7, baseData)).toThrow('Invalid drip step');
    });
});

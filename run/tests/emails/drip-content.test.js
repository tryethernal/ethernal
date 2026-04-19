const { getEmailContent } = require('../../emails/drip-content');

describe('drip-content', () => {
    const baseData = {
        explorerSlug: 'my-chain',
        explorerLink: 'https://my-chain.app.tryethernal.com',
        migrateUrl: 'https://app.tryethernal.com/?explorerToken=xyz',
        email: 'dev@example.com',
        unsubscribeUrl: 'https://app.tryethernal.com/api/demo/unsubscribe?token=abc&src=drip',
        appDomain: 'tryethernal.com'
    };

    it('Should return branded HTML content for step 1', () => {
        const content = getEmailContent(1, baseData);
        expect(content.subject).toEqual('Your Ethernal demo is live');
        expect(content.textPart).toContain('my-chain.app.tryethernal.com');
        expect(content.htmlPart).toContain('Your Ethernal demo is live');
        expect(content.htmlPart).toContain('Antoine');
        expect(content.htmlPart).toContain('Open explorer');
    });

    it('Should return content for step 2 with activity summary in subject and body', () => {
        const content = getEmailContent(2, { ...baseData, activitySummary: '12 token transfers' });
        expect(content.subject).toEqual('12 token transfers synced on your demo');
        expect(content.htmlPart).toContain('12 token transfers');
        expect(content.htmlPart).toContain('my-chain');
    });

    it('Should return content for step 3 with comparison table', () => {
        const content = getEmailContent(3, baseData);
        expect(content.subject).toEqual('What the paid plan adds');
        expect(content.htmlPart).toContain('Demo');
        expect(content.htmlPart).toContain('Paid');
        expect(content.htmlPart).toContain('Data retention');
        expect(content.htmlPart).toContain('Start free trial');
        expect(content.htmlPart).toContain(baseData.migrateUrl);
    });

    it('Should render tailoredBenefits when provided on step 3', () => {
        const content = getEmailContent(3, { ...baseData, tailoredBenefits: 'Faster debugging for your rollup.' });
        expect(content.htmlPart).toContain('Faster debugging for your rollup.');
    });

    it('Should return content for step 4 with custom team context', () => {
        const content = getEmailContent(4, { ...baseData, teamContext: 'Acme builds on Base L2' });
        expect(content.subject).toEqual('Who else is running Ethernal');
        expect(content.htmlPart).toContain('Acme builds on Base L2');
        expect(content.htmlPart).toContain(baseData.migrateUrl);
    });

    it('Should return content for step 4 without custom team context', () => {
        const content = getEmailContent(4, baseData);
        expect(content.htmlPart).toContain('production L2s');
    });

    it('Should return content for step 5 with default alert body', () => {
        const content = getEmailContent(5, baseData);
        expect(content.subject).toEqual('Your demo expires in 2 days');
        expect(content.htmlPart).toContain('2 days');
        expect(content.htmlPart).toContain('config carries over');
        expect(content.htmlPart).toContain('my-chain');
        expect(content.htmlPart).toContain(baseData.migrateUrl);
    });

    it('Should render expirationWarning override on step 5', () => {
        const content = getEmailContent(5, { ...baseData, expirationWarning: 'You have 1,200 tx worth keeping.' });
        expect(content.htmlPart).toContain('You have 1,200 tx worth keeping.');
    });

    it('Should return content for step 6 with default recovery body', () => {
        const content = getEmailContent(6, baseData);
        expect(content.subject).toEqual('Your demo expired, 48h to recover');
        expect(content.htmlPart).toContain('48 hours');
        expect(content.htmlPart).toContain('Restore explorer');
        expect(content.htmlPart).toContain(baseData.migrateUrl);
    });

    it('Should render recoveryHook override on step 6', () => {
        const content = getEmailContent(6, { ...baseData, recoveryHook: 'Your 1,200 tx are still here.' });
        expect(content.htmlPart).toContain('Your 1,200 tx are still here.');
    });

    it('Should throw for invalid step', () => {
        expect(() => getEmailContent(7, baseData)).toThrow('Invalid drip step');
    });

    it('Should fully substitute template placeholders', () => {
        // unsubscribeUrl contains `&` which gets encoded to `&amp;` in the rendered HTML,
        // so assert on a unique substring that survives escaping.
        for (let step = 1; step <= 6; step++) {
            const content = getEmailContent(step, baseData);
            expect(content.htmlPart).toContain('api/demo/unsubscribe?token=abc&amp;src=drip');
            expect(content.htmlPart).toContain(baseData.appDomain);
            expect(content.htmlPart).not.toContain('{{');
        }
    });

    it('Should HTML-escape the subject in the title tag', () => {
        const content = getEmailContent(2, { ...baseData, activitySummary: '<b>alert</b>' });
        expect(content.htmlPart).toContain('<title>&lt;b&gt;alert&lt;/b&gt; synced on your demo</title>');
        expect(content.htmlPart).not.toContain('<title><b>alert</b>');
    });

    it('Should not re-substitute placeholders injected via enriched content', () => {
        const content = getEmailContent(3, { ...baseData, tailoredBenefits: 'Visit {{appDomain}} for more.' });
        expect(content.htmlPart).toContain('Visit {{appDomain}} for more.');
    });

    it('Should not contain AI-tell phrases in any step', () => {
        const forbidden = [
            'gives you a taste',
            'feel free to',
            'enduring',
            'testament',
            'Here is what you',
            'journey',
            'unlock',
            'pivotal'
        ];
        const dataWithAllHooks = {
            ...baseData,
            activitySummary: '1,247 blocks',
            teamContext: 'Team X',
            tailoredBenefits: 'Benefit',
            expirationWarning: 'Warning',
            recoveryHook: 'Recovery'
        };
        for (let step = 1; step <= 6; step++) {
            const content = getEmailContent(step, dataWithAllHooks);
            const haystack = `${content.subject}\n${content.textPart}\n${content.htmlPart || ''}`;
            for (const phrase of forbidden) {
                expect(haystack.toLowerCase()).not.toContain(phrase.toLowerCase());
            }
        }
    });
});

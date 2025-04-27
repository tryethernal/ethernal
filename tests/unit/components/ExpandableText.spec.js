import ExpandableText from '@/components/ExpandableText.vue';

describe('ExpandableText.vue', () => {
  const shortText = 'Short text';
  const longText = 'a'.repeat(600); // Text longer than default maxChars (500)

  it('should render short text without truncation', async () => {
    const wrapper = mount(ExpandableText, {
      props: {
        text: shortText
      }
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should render truncated long text with view more button', async () => {
    const wrapper = mount(ExpandableText, {
      props: {
        text: longText
      }
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should expand text when clicking view more', async () => {
    const wrapper = mount(ExpandableText, {
      props: {
        text: longText
      }
    });

    await wrapper.find('a').trigger('click');
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should render text in pre tag when pre prop is true', async () => {
    const wrapper = mount(ExpandableText, {
      props: {
        text: shortText,
        pre: true
      }
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should show copy success icon after copying', async () => {
    // Setup fake timers
    vi.useFakeTimers();
    
    // Mock execCommand since it's not available in test environment
    document.execCommand = vi.fn();
    
    const wrapper = mount(ExpandableText, {
      props: {
        text: shortText
      }
    });

    await wrapper.find('.copy-btn-container .v-btn').trigger('click');
    expect(wrapper.html()).toMatchSnapshot();

    // Advance timer to simulate waiting for icon to revert
    await vi.advanceTimersByTime(2100);
    expect(wrapper.html()).toMatchSnapshot();

    // Cleanup
    vi.useRealTimers();
  });

  it('should emit expand/collapse events when toggling', async () => {
    const wrapper = mount(ExpandableText, {
      props: {
        text: longText
      }
    });

    await wrapper.find('a').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('expand');

    await wrapper.find('a').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('collapse');
  });

  it('should handle slot content', async () => {
    const wrapper = mount(ExpandableText, {
      slots: {
        default: 'Slot content'
      }
    });

    expect(wrapper.html()).toMatchSnapshot();
  });
}); 
import NFTGallery from '@/components/NFTGallery.vue';

const stubs = ['ERC721TokenCard'];

describe('NFTGallery.vue', () => {
  it('Should show loading state', async () => {
    vi.spyOn(server, 'getTokenBalances').mockResolvedValueOnce({ data: [] });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'address'
      },
      global: {
        stubs
      }
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show empty state for address mode', async () => {
    vi.spyOn(server, 'getTokenBalances').mockResolvedValueOnce({ data: [] });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'address'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show empty state for collection mode when contract not found', async () => {
    vi.spyOn(server, 'getContract').mockResolvedValueOnce({ data: null });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'collection'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show empty state for collection mode when no total supply', async () => {
    vi.spyOn(server, 'getContract').mockResolvedValueOnce({ data: { address: '0x123' } });
    vi.spyOn(server, 'getErc721TotalSupply').mockResolvedValueOnce({ data: { totalSupply: 0 } });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'collection'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show NFTs list for address mode', async () => {
    const mockNFTs = [
      { token: '0x123', tokenId: '1', tokenContract: { address: '0x123' } },
      { token: '0x123', tokenId: '2', tokenContract: { address: '0x123' } }
    ];
    vi.spyOn(server, 'getTokenBalances').mockResolvedValueOnce({ data: mockNFTs });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'address'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show NFTs list for collection mode', async () => {
    const mockContract = { address: '0x123' };
    vi.spyOn(server, 'getContract').mockResolvedValueOnce({ data: mockContract });
    vi.spyOn(server, 'getErc721TotalSupply').mockResolvedValueOnce({ data: { totalSupply: 2 } });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'collection'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should show pagination and handle page changes when there are more than 12 NFTs', async () => {
    const mockContract = { address: '0x123' };
    vi.spyOn(server, 'getContract').mockResolvedValueOnce({ data: mockContract });
    vi.spyOn(server, 'getErc721TotalSupply').mockResolvedValueOnce({ data: { totalSupply: 24 } });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'collection'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    expect(wrapper.html()).toMatchSnapshot('first page');

    // Change to second page
    await wrapper.findComponent({ name: 'v-pagination' }).vm.$emit('update:modelValue', 2);
    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toMatchSnapshot('second page');
  });

  it('Should refetch NFTs when address changes', async () => {
    const getTokenBalancesSpy = vi.spyOn(server, 'getTokenBalances').mockResolvedValueOnce({ data: [] });
    
    const wrapper = mount(NFTGallery, {
      props: {
        address: '0x123',
        mode: 'address'
      },
      global: {
        stubs
      }
    });

    await flushPromises();
    
    getTokenBalancesSpy.mockResolvedValueOnce({ data: [] });
    await wrapper.setProps({ address: '0x456' });
    
    await flushPromises();
    expect(getTokenBalancesSpy).toHaveBeenCalledTimes(2);
    expect(wrapper.html()).toMatchSnapshot();
  });
}); 
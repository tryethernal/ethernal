import { h } from 'vue';
import { Icon } from '@iconify/vue';

export const iconify = (set) => ({
    component: (props) =>
        h(Icon, {
            icon: `${set}:${props.icon}`,
            disabled: props.disabled,
        })
});

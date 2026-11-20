import register from 'ShopUi/app/registry';
export default register(
    'traceable-item-list-view-tracker',
    () =>
        import(
            /* webpackMode: "lazy" */
            /* webpackChunkName: "traceable-item-list-view-tracker" */
            './traceable-item-list-view-tracker'
        ),
);

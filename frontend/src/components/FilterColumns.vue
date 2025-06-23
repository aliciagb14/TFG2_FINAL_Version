<template>
    <n-button>
        <n-icon size="30">
            <FilterIcon />
        </n-icon>
    </n-button>

    <n-space>
        <n-input v-model="filterLastName" placeholder="Filtrar por apellido" @update:value="emitFilters"/>
        <n-input-number v-model="filterYear" placeholder="Filtrar por año académico" @update:value="emitFilters"/>
    </n-space>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import { NIcon, NInput } from 'naive-ui';
    import { Search as FilterIcon } from '@vicons/ionicons5';
    const filterLastName = ref('')
    const filterYear = ref(null)
    const props = defineProps({
        user: Object
    })
    const emit = defineEmits(['updateFilters']);

    const emitFilters = () => {
        console.log(props.user)
    emit('updateFilters', { lastName: filterLastName.value, year: filterYear.value });
    };

</script>
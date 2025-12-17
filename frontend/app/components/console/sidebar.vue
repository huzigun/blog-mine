<script setup lang="ts">
interface NavigationItem {
  name: string;
  to: string;
  icon: string;
  badge?: string | number;
  target?: string;
  subItems?: NavigationItem[];
}

interface NavigationGroup {
  title?: string;
  items: NavigationItem[];
}

interface Props {
  isCollapsed?: boolean;
}

defineProps<Props>();

const route = useRoute();

// Collapsible navigation state
const expandedItems = ref<Set<string>>(new Set());
const toggleItem = (itemName: string) => {
  if (expandedItems.value.has(itemName)) {
    expandedItems.value.delete(itemName);
  } else {
    expandedItems.value.add(itemName);
  }
};

// Hover state for collapsed sidebar
const isHovered = ref(false);

// Grouped navigation structure
const navigationGroups: NavigationGroup[] = [
  {
    items: [
      {
        name: '성과 대시보드',
        to: '/console/dashboard',
        icon: 'i-heroicons-chart-bar',
      },
      {
        name: '블로그 순위 추적',
        to: '/console/blogs',
        icon: 'i-heroicons-magnifying-glass',
      },
      {
        name: '스마트 원고 생성',
        to: '/console/ai-post',
        icon: 'i-heroicons-sparkles',
      },
      {
        name: '원고 보관함',
        to: '/console/workspace',
        icon: 'i-heroicons-folder',
      },
      {
        name: '페르소나',
        to: '/console/personas',
        icon: 'i-heroicons-user-group',
        subItems: [
          {
            name: '페르소나 생성',
            to: '/console/personas/create',
            icon: 'i-heroicons-user-plus',
          },
          {
            name: '페르소나 관리',
            to: '/console/personas/manage',
            icon: 'i-heroicons-users',
          },
        ],
      },
      {
        name: '콘텐츠 생성',
        to: '/console/content',
        icon: 'i-heroicons-rectangle-stack',
        subItems: [
          {
            name: '이미지 만들기',
            to: '/console/content/ai-image',
            icon: 'i-heroicons-photo',
          },
        ],
      },
      {
        name: '이용자 가이드',
        to: 'https://atomosads.notion.site/_BlogMine_v1-0-2a83f8c41f0880fb959cd13789721b9b?source=copy_link',
        icon: 'i-heroicons-book-open',
        target: '_blank',
      },
    ],
  },
];

// Check if route is active
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/');
};
</script>

<template>
  <div
    class="flex h-full flex-col bg-[#111c43]"
    @mouseenter="isCollapsed && (isHovered = true)"
    @mouseleave="isCollapsed && (isHovered = false)"
  >
    <!-- Logo -->
    <div
      class="flex h-16 items-center justify-center border-b border-neutral-800 px-4"
    >
      <NuxtLink
        to="/console/dashboard"
        :class="[
          'flex items-center gap-3 transition-opacity',
          isCollapsed && !isHovered && 'opacity-0 lg:opacity-100',
        ]"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30"
        >
          <UIcon name="i-heroicons-rocket-launch" class="h-6 w-6 text-white" />
        </div>
        <div
          v-if="!isCollapsed || isHovered"
          class="flex flex-col overflow-hidden"
        >
          <span
            :class="[
              'text-lg font-bold text-white whitespace-nowrap transition-opacity duration-200',
              isCollapsed && isHovered && 'delay-200',
            ]"
          >
            Blog Mine
          </span>
          <span
            :class="[
              'text-xs text-neutral-400 whitespace-nowrap transition-opacity duration-200',
              isCollapsed && isHovered && 'delay-200',
            ]"
          >
            Admin Console
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overflow-x-visible px-3 py-4">
      <div
        v-for="(group, groupIndex) in navigationGroups"
        :key="groupIndex"
        :class="[groupIndex > 0 && 'mt-6']"
      >
        <!-- Group Title -->
        <div
          v-if="group.title && !isCollapsed"
          class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400"
        >
          {{ group.title }}
        </div>

        <!-- Navigation Items -->
        <div class="space-y-1">
          <template v-for="item in group.items" :key="item.name">
            <!-- Item with SubItems (Collapsible) -->
            <div v-if="item.subItems">
              <!-- Parent Item Button -->
              <button
                :class="[
                  'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive(item.to)
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-neutral-300 hover:bg-neutral-800/50',
                  isCollapsed &&
                    !isHovered &&
                    'justify-center lg:justify-start',
                ]"
                @click="(!isCollapsed || isHovered) && toggleItem(item.name)"
                type="button"
                :title="item.name"
              >
                <!-- Active Indicator -->
                <div
                  v-if="isActive(item.to)"
                  class="absolute left-0 h-8 w-1 rounded-r-full bg-primary-500"
                />

                <UIcon :name="item.icon" class="h-5 w-5" />
                <span
                  v-if="!isCollapsed || isHovered"
                  :class="[
                    'flex-1 truncate text-left whitespace-nowrap transition-opacity duration-200',
                    isCollapsed && isHovered && 'delay-200',
                  ]"
                >
                  {{ item.name }}
                </span>

                <!-- Chevron Icon -->
                <UIcon
                  v-if="!isCollapsed || isHovered"
                  :name="
                    expandedItems.has(item.name)
                      ? 'i-heroicons-chevron-down'
                      : 'i-heroicons-chevron-right'
                  "
                  :class="[
                    'h-4 w-4 transition-all duration-200',
                    expandedItems.has(item.name) && 'rotate-0',
                    isCollapsed && isHovered && 'delay-200',
                  ]"
                />
              </button>

              <!-- SubItems (Collapsible - when expanded) -->
              <div
                v-if="
                  (!isCollapsed || isHovered) && expandedItems.has(item.name)
                "
                class="mt-1 space-y-1 pl-4"
              >
                <NuxtLink
                  v-for="subItem in item.subItems"
                  :key="subItem.name"
                  :to="subItem.to"
                  :class="[
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive(subItem.to)
                      ? 'bg-primary-600/10 text-primary-300'
                      : 'text-neutral-400 hover:bg-neutral-800/50',
                  ]"
                  :target="subItem.target"
                >
                  <!-- Dot instead of icon -->
                  <div
                    :class="[
                      'h-[5px] w-[5px] rounded-full',
                      isActive(subItem.to)
                        ? 'bg-primary-400'
                        : 'bg-neutral-500',
                    ]"
                  />
                  <span
                    :class="[
                      'flex-1 truncate whitespace-nowrap transition-opacity duration-200',
                      isCollapsed && isHovered && 'delay-200',
                    ]"
                  >
                    {{ subItem.name }}
                  </span>
                </NuxtLink>
              </div>
            </div>

            <!-- Regular Item (No SubItems) -->
            <NuxtLink
              v-else
              :to="item.to"
              :class="[
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive(item.to)
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-neutral-300 hover:bg-neutral-800/50',
                isCollapsed && !isHovered && 'justify-center lg:justify-start',
              ]"
              :target="item.target"
            >
              <!-- Active Indicator -->
              <div
                v-if="isActive(item.to)"
                class="absolute left-0 h-8 w-1 rounded-r-full bg-primary-500"
              />

              <UIcon :name="item.icon" class="h-5 w-5" />
              <span
                v-if="!isCollapsed || isHovered"
                :class="[
                  'flex-1 truncate whitespace-nowrap transition-opacity duration-200',
                  isCollapsed && isHovered && 'delay-200',
                ]"
              >
                {{ item.name }}
              </span>

              <!-- Badge -->
              <span
                v-if="item.badge && (!isCollapsed || isHovered)"
                :class="[
                  'flex h-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-opacity duration-200',
                  isActive(item.to)
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-700 text-neutral-300',
                  isCollapsed && isHovered && 'delay-200',
                ]"
              >
                {{ item.badge }}
              </span>
            </NuxtLink>
          </template>
        </div>
      </div>
    </nav>
  </div>
</template>

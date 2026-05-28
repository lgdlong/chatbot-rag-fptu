"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  List,
  Loader,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Title,
  SimpleGrid,
  Paper,
} from "@mantine/core";
import { IconCheck, IconCreditCard, IconSparkles } from "@tabler/icons-react";
import { api } from "@/lib/api";
import Link from "next/link";

type SubscriptionTier = "SILVER" | "GOLD";

type Plan = {
  tier: "BASIC" | SubscriptionTier;
  name: string;
  price: string;
  description: string;
  benefits: string[];
  accent: string;
  buttonLabel: string;
  buttonVariant: "filled" | "light" | "outline";
  buttonColor: string;
  disabled?: boolean;
};

const plans: Plan[] = [
  {
    tier: "BASIC",
    name: "Cơ bản",
    price: "0 VNĐ",
    description: "Phù hợp khi bạn chỉ cần dùng các tính năng cốt lõi và không cần tần suất hỏi đáp cao.",
    benefits: [
      "10 tin nhắn trong mỗi cửa sổ 5 giờ",
      "Dành cho nhu cầu dùng thử hoặc sử dụng nhẹ",
      "Có thể nâng cấp bất cứ lúc nào khi cần thêm quota",
    ],
    accent: "var(--mantine-color-zinc-5)",
    buttonLabel: "Đang dùng",
    buttonVariant: "outline",
    buttonColor: "zinc.4",
    disabled: true,
  },
  {
    tier: "SILVER",
    name: "Bạc",
    price: "10.000 VNĐ / 30 ngày",
    description: "Phù hợp cho nhu cầu học tập đều đặn, khi bạn cần thêm lượt hỏi để ôn bài, tra cứu tài liệu và làm bài tập.",
    benefits: [
      "50 tin nhắn trong mỗi cửa sổ 5 giờ",
      "Phù hợp cho học cá nhân và ôn luyện hằng ngày",
      "Giới hạn cao hơn rõ rệt so với gói cơ bản",
    ],
    accent: "var(--mantine-color-brandBlue-5)",
    buttonLabel: "Nâng lên Bạc",
    buttonVariant: "filled",
    buttonColor: "brandBlue",
  },
  {
    tier: "GOLD",
    name: "Vàng",
    price: "20.000 VNĐ / 30 ngày",
    description: "Dành cho người dùng hỏi đáp nhiều, cần giới hạn cao nhất để khai thác tài liệu liên tục trong ngày.",
    benefits: [
      "200 tin nhắn trong mỗi cửa sổ 5 giờ",
      "Dành cho nhu cầu sử dụng dày và liên tục",
      "Hạn mức cao nhất trong các gói hiện tại",
    ],
    accent: "var(--mantine-color-yellow-5)",
    buttonLabel: "Nâng lên Vàng",
    buttonVariant: "light",
    buttonColor: "yellow",
  },
];

export default function StudentSubscriptionPage() {
  const queryClient = useQueryClient();
  const { data: subscriptionData, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.getSubscription(),
  });
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);

  const subscription = subscriptionData?.subscription;
  const pendingPlan = useMemo(
    () => plans.find((plan) => plan.tier === pendingTier) ?? null,
    [pendingTier],
  );

  const upgradeMutation = useMutation({
    mutationFn: (tier: SubscriptionTier) => api.upgradeSubscription(tier),
    onSuccess: (data) => {
      if (data.success) {
        setPendingTier(null);
        void queryClient.invalidateQueries({ queryKey: ["subscription"] });
        notifications.show({
          color: "green",
          title: "Đã nâng gói trong chế độ test",
          message: data.message || "Gói đã được cập nhật ngay lập tức.",
        });
        return;
      }

      notifications.show({
        color: "red",
        title: "Không thể nâng gói",
        message: "Máy chủ không trả về kết quả hợp lệ.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể khởi tạo thanh toán.";
      notifications.show({
        color: "red",
        title: "Lỗi thanh toán",
        message,
      });
    },
  });

  const currentTierLabel = subscription?.tier === "GOLD"
    ? "Vàng"
    : subscription?.tier === "SILVER"
      ? "Bạc"
      : "Cơ bản";

  return (
    <Box
      className="min-h-full w-full overflow-y-auto px-4 py-8"
      style={{
        background: "radial-gradient(circle at top, rgba(59, 130, 246, 0.16), transparent 34%), linear-gradient(180deg, #09090b 0%, #111111 100%)",
      }}
    >
      <Container size="lg" px={0}>
        <Stack gap="xl">
          <Box>
            <Group gap="xs" mb={8}>
              <IconSparkles size={18} color="var(--mantine-color-brandBlue-4)" />
              <Badge variant="light" color="brandBlue" radius="xs">
                Gói cước
              </Badge>
            </Group>
            <Title order={2} c="zinc.1" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", fontWeight: 800 }}>
              Chọn gói phù hợp với nhu cầu học tập của bạn
            </Title>
            <Text mt="sm" c="dimmed" style={{ maxWidth: 760, lineHeight: 1.7 }}>
              Đây là trang riêng cho nâng cấp gói. Sau khi chọn gói, bạn sẽ được chuyển sang trang checkout để xem thông tin chuyển khoản và hoàn tất thanh toán.
            </Text>
          </Box>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.tier === plan.tier;

              return (
                <Card
                  key={plan.tier}
                  withBorder
                  radius="xl"
                  p="xl"
                  h="100%"
                  style={{
                    borderColor: "rgba(63, 63, 70, 0.9)",
                    background: "linear-gradient(180deg, rgba(24, 24, 27, 0.96), rgba(15, 15, 15, 0.98))",
                    boxShadow: `0 24px 72px ${plan.accent}15`,
                  }}
                >
                  <Stack gap="md" h="100%">
                    <Group justify="space-between" align="flex-start" wrap="wrap">
                      <Box>
                        <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                          Gói {plan.name}
                        </Text>
                        <Title order={3} c="zinc.1" style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                          {plan.name}
                        </Title>
                      </Box>
                      <Badge variant="light" radius="xs" style={{ color: plan.accent, borderColor: plan.accent }}>
                        {plan.price}
                      </Badge>
                    </Group>

                    <Text c="zinc.3" style={{ lineHeight: 1.7 }}>
                      {plan.description}
                    </Text>

                    <List
                      spacing="sm"
                      icon={
                        <ThemeIcon color="dark" size={22} radius="xl" variant="light">
                          <IconCheck size={14} />
                        </ThemeIcon>
                      }
                    >
                      {plan.benefits.map((benefit) => (
                        <List.Item key={benefit}>
                          <Text c="zinc.2">{benefit}</Text>
                        </List.Item>
                      ))}
                    </List>

                    <Group justify="space-between" align="center" mt="auto" pt="xs" gap="md" wrap="wrap">
                      <Text size="sm" c="dimmed">
                        {isCurrentPlan ? "Bạn đang dùng gói này." : "Bấm để đi đến trang checkout."}
                      </Text>
                      <Button
                        leftSection={<IconCreditCard size={16} />}
                        color={plan.buttonColor as "brandBlue" | "yellow" | "zinc.4"}
                        variant={plan.buttonVariant}
                        radius="md"
                        size="lg"
                        fullWidth
                        style={{
                          minHeight: 52,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor:
                            plan.tier === "BASIC"
                              ? "rgba(161, 161, 170, 0.7)"
                              : plan.tier === "SILVER"
                                ? "rgba(59, 130, 246, 0.75)"
                                : "rgba(234, 179, 8, 0.75)",
                          boxShadow:
                            plan.tier === "BASIC"
                              ? "0 0 0 1px rgba(161, 161, 170, 0.08), 0 12px 30px rgba(0, 0, 0, 0.28)"
                              : plan.tier === "SILVER"
                                ? "0 16px 36px rgba(59, 130, 246, 0.20)"
                                : "0 16px 36px rgba(234, 179, 8, 0.18)",
                        }}
                        loading={upgradeMutation.isPending}
                        disabled={plan.disabled || isCurrentPlan}
                        onClick={() => setPendingTier(plan.tier === "BASIC" ? null : plan.tier)}
                      >
                        {plan.disabled || isCurrentPlan ? "Đang dùng" : plan.buttonLabel}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <Group justify="center">
            <Button component={Link} href="/student/chat" variant="light" color="gray" radius="xs">
              Quay lại chat
            </Button>
          </Group>
        </Stack>
      </Container>

      <Modal
        opened={pendingTier !== null}
        onClose={() => setPendingTier(null)}
        title="Xác nhận nâng gói"
        centered
        radius="lg"
        size="md"
      >
        <Stack gap="md">
          <Text c="zinc.2" style={{ lineHeight: 1.7 }}>
            Đây là chế độ test. Khi bạn xác nhận, hệ thống sẽ nâng gói ngay lập tức mà không cần chờ webhook thanh toán.
          </Text>

          {pendingPlan && (
            <Card
              withBorder
              radius="md"
              p="md"
              style={{ borderColor: "rgba(63, 63, 70, 0.9)", background: "rgba(24, 24, 27, 0.96)" }}
            >
              <Stack gap={8}>
                <Group justify="space-between" align="center">
                  <Text fw={700} c="zinc.1">
                    Gói {pendingPlan.name}
                  </Text>
                  <Badge variant="light" radius="xs">
                    {pendingPlan.price}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Nội dung audit mẫu:
                </Text>
                <Paper
                  p="sm"
                  radius="md"
                  style={{
                    background: "rgba(9, 9, 11, 0.9)",
                    border: "1px solid rgba(63, 63, 70, 0.8)",
                  }}
                >
                  <Text size="xs" ff="monospace" c="zinc.3" style={{ wordBreak: "break-word" }}>
                    {`DEMO PAYMENT | NÂNG GÓI ${pendingPlan.tier} | Giao dịch mẫu, không dùng tiền thật`}
                  </Text>
                </Paper>
              </Stack>
            </Card>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="light" color="gray" onClick={() => setPendingTier(null)}>
              Hủy
            </Button>
            <Button
              color={pendingTier === "GOLD" ? "yellow" : "brandBlue"}
              variant="filled"
              radius="md"
              loading={upgradeMutation.isPending}
              onClick={() => {
                if (!pendingTier) {
                  return;
                }

                upgradeMutation.mutate(pendingTier);
              }}
            >
              Đồng ý nâng ngay
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

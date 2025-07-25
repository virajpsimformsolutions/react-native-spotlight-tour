import { expect } from "@assertive-ts/core";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import { type ReactElement, type ReactNode, useEffect } from "react";
import { Text } from "react-native";
import Sinon from "sinon";
import { describe, it, suite } from "vitest";

import { type SpotlightTour,
  type TourState,
  type TourStep,
  useSpotlightTour,
} from "../../../../src/lib/SpotlightTour.context";
import { SpotlightTourProvider } from "../../../../src/lib/SpotlightTour.provider";
import { AttachStep } from "../../../../src/lib/components/attach-step/AttachStep.component";
import { BASE_STEP } from "../../../helpers/TestTour";

interface TestLayoutProps {
  children: ReactNode;
}

const STEPS = Array.from<TourStep>({ length: 3 }).fill(BASE_STEP);

function AutoStartTour({ children }: TestLayoutProps): ReactElement {
  const { start } = useSpotlightTour();

  useEffect(() => {
    start();
  }, []);

  return <>{children}</>;
}

function TestScreen(): ReactElement {
  return (
    <AutoStartTour>
      <AttachStep index={0}>
        <Text>{"Test Tour 1"}</Text>
      </AttachStep>

      <AttachStep index={[1]}>
        <Text>{"Test Tour 2"}</Text>
      </AttachStep>

      <AttachStep index={2}>
        <Text>{"Test Tour 3"}</Text>
      </AttachStep>
    </AutoStartTour>
  );
}

suite("[Integration] TourOverlay.component.test.tsx", () => {
  describe("when the spot is in the first step", () => {
    it("renders the first step", async () => {
      const { getByText } = render(
        <SpotlightTourProvider steps={STEPS}>
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));
    });
  });

  describe("when the next action is called", () => {
    it("removes the previous step and renders the next step", async () => {
      const user = userEvent.setup();

      const { getByText, queryByText } = render(
        <SpotlightTourProvider steps={STEPS}>
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      await user.press(getByText("Next"));

      await waitFor(() => getByText("Step 2"));

      expect(queryByText("Step 1")).toBeNull();
    });
  });

  describe("when previous action is called", () => {
    it("removes the current step and renders the previous step", async () => {
      const user = userEvent.setup();

      const { getByText, queryByText } = render(
        <SpotlightTourProvider steps={STEPS}>
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      await user.press(getByText("Next"));

      await waitFor(() => getByText("Step 2"));

      expect(queryByText("Step 1")).toBeNull();

      await user.press(getByText("Previous"));

      await waitFor(() => getByText("Step 1"));

      expect(queryByText("Step 2")).toBeNull();
    });
  });

  describe("when the backdrop behavior is set to continue", () => {
    it("goes to the next step when the backdrop is pressed", async () => {
      const user = userEvent.setup();

      const { findByTestId, getByText, queryByText } = render(
        <SpotlightTourProvider steps={STEPS} onBackdropPress="continue">
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      const backdrop = await findByTestId("Spot Svg");

      await user.press(backdrop);

      await waitFor(() => getByText("Step 2"));

      expect(queryByText("Step 1")).toBeNull();
    });
  });

  describe("when the backdrop behavior is set to stop", () => {
    it("stops the tour when the backdrop is pressed", async () => {
      const user = userEvent.setup();

      const { findByTestId, getByText, queryByText } = render(
        <SpotlightTourProvider steps={STEPS} onBackdropPress="stop">
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      const backdrop = await findByTestId("Spot Svg");

      await user.press(backdrop);

      expect(queryByText("Step 1")).toBeNull();
      expect(queryByText("Step 2")).toBeNull();
      expect(queryByText("Step 3")).toBeNull();
    });
  });

  describe("when the backdrop behavior is present in the step", () => {
    it("overrides the backdrop press default behavior", async () => {
      const steps = STEPS.map<TourStep>((step, i) => {
        return i === 1
          ? { ...step, onBackdropPress: "stop" }
          : step;
      });
      const user = userEvent.setup();

      const { findByTestId, getByText, queryByText } = render(
        <SpotlightTourProvider steps={steps} onBackdropPress="continue">
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      const backdrop = await findByTestId("Spot Svg");

      await user.press(backdrop);

      await waitFor(() => getByText("Step 2"));

      expect(queryByText("Step 1")).toBeNull();

      await user.press(backdrop);

      expect(queryByText("Step 1")).toBeNull();
      expect(queryByText("Step 2")).toBeNull();
      expect(queryByText("Step 3")).toBeNull();
    });
  });

  describe("when a function is passed to the backdrop press behavior", () => {
    it("injects the SpotlightTour object in the options", async () => {
      const spy = Sinon.spy<(options: SpotlightTour) => void>(() => undefined);
      const user = userEvent.setup();

      const { findByTestId, getByText } = render(
        <SpotlightTourProvider steps={STEPS} onBackdropPress={spy}>
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      const backdrop = await findByTestId("Spot Svg");

      await user.press(backdrop);

      Sinon.assert.calledOnceWithExactly(spy, {
        current: 0,
        goTo: Sinon.match.func,
        next: Sinon.match.func,
        pause: Sinon.match.func,
        previous: Sinon.match.func,
        resume: Sinon.match.func,
        start: Sinon.match.func,
        status: "running",
        stop: Sinon.match.func,
      });
    });
  });

  describe("when a function is passed to the onStop prop in the tour provider", () => {
    it("invokes the function and injects the OnStopBehavior object in the values", async () => {
      const spy = Sinon.spy<(values: TourState) => void>(() => undefined);
      const user = userEvent.setup();

      const { getByText } = render(
        <SpotlightTourProvider steps={STEPS} onStop={spy}>
          <TestScreen />
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      await user.press(getByText("Stop"));

      Sinon.assert.calledOnceWithExactly(spy, {
        index: 0,
        isLast: false,
      });
    });

    describe("and the tour is stopped in the second step", () => {
      describe("and the step is NOT the last one", () => {
        it("returns step index 1 and is last equals false", async () => {
          const spy = Sinon.spy<(values: TourState) => void>(() => undefined);
          const user = userEvent.setup();

          const { getByText } = render(
            <SpotlightTourProvider steps={STEPS} onStop={spy}>
              <TestScreen />
            </SpotlightTourProvider>,
          );

          await waitFor(() => getByText("Step 1"));

          await user.press(getByText("Next"));

          await waitFor(() => getByText("Step 2"));

          await user.press(getByText("Stop"));

          Sinon.assert.calledOnceWithExactly(spy, {
            index: 1,
            isLast: false,
          });
        });
      });
    });

    describe("and the tour is stopped in the third step", () => {
      describe("and the step is the last one", () => {
        it("returns step index 2 and is last equals true", async () => {
          const spy = Sinon.spy<(values: TourState) => void>(() => undefined);
          const user = userEvent.setup();

          const { getByText } = render(
            <SpotlightTourProvider steps={STEPS} onStop={spy}>
              <TestScreen />
            </SpotlightTourProvider>,
          );

          await waitFor(() => getByText("Step 1"));

          await user.press(getByText("Next"));

          await waitFor(() => getByText("Step 2"));

          await user.press(getByText("Next"));

          await waitFor(() => getByText("Step 3"));

          await user.press(getByText("Stop"));

          Sinon.assert.calledOnceWithExactly(spy, {
            index: 2,
            isLast: true,
          });
        });
      });
    });
  });

  describe("when an AttachStep has multiple indexes", () => {
    it("renders all the steps correctly", async () => {
      const spy = Sinon.spy<(values: TourState) => void>(() => undefined);
      const user = userEvent.setup();

      const { getByText } = render(
        <SpotlightTourProvider steps={STEPS} onStop={spy}>
          <AutoStartTour>
            <AttachStep index={[0, 1, 2]}>
              <Text>{"Test Tour"}</Text>
            </AttachStep>
          </AutoStartTour>
        </SpotlightTourProvider>,
      );

      await waitFor(() => getByText("Step 1"));

      await user.press(getByText("Next"));

      await waitFor(() => getByText("Step 2"));

      await user.press(getByText("Next"));

      await waitFor(() => getByText("Step 3"));

      await user.press(getByText("Stop"));

      Sinon.assert.calledOnceWithExactly(spy, {
        index: 2,
        isLast: true,
      });
    });
  });
});
